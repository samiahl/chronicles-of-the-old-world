package com.campaign.routes

import com.campaign.model.*
import com.mongodb.client.model.Filters
import com.mongodb.client.model.Updates
import com.mongodb.kotlin.client.coroutine.MongoDatabase
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.auth.jwt.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.coroutines.flow.toList
import org.bson.Document
import org.bson.types.ObjectId
import java.time.Instant

fun Route.campaignRoutes(db: MongoDatabase) {
    val campaigns = db.getCollection<Document>("campaigns")
    val players = db.getCollection<Document>("players")

    route("/campaigns") {
        get {
            val result = campaigns.find().toList().map { it.toCampaign() }
            call.respond(result)
        }

        get("/{id}") {
            val id = call.parameters["id"] ?: return@get call.respond(HttpStatusCode.BadRequest)
            try {
                val campaign = campaigns.find(Filters.eq("_id", ObjectId(id))).toList().firstOrNull()
                    ?: return@get call.respond(HttpStatusCode.NotFound)
                call.respond(campaign.toCampaign())
            } catch (_: IllegalArgumentException) {
                call.respond(HttpStatusCode.BadRequest)
            }
        }

        authenticate("auth-jwt") {
            post {
                val principal = call.principal<JWTPrincipal>()!!
                val userId = principal.payload.getClaim("userId").asString()
                val username = principal.payload.getClaim("username").asString()
                val req = call.receive<CreateCampaignRequest>()
                val now = Instant.now().toString()
                val memberDoc = Document()
                    .append("userId", userId)
                    .append("commanderName", username)
                    .append("faction", null as String?)
                    .append("joinedAt", now)
                val doc = Document()
                    .append("name", req.name)
                    .append("description", req.description)
                    .append("theme", req.theme)
                    .append("createdBy", userId)
                    .append("createdByName", username)
                    .append("members", listOf(memberDoc))
                    .append("pendingRequests", emptyList<Document>())
                    .append("status", "active")
                    .append("createdAt", now)
                    .append("type", req.type)
                    .append("subType", req.subType)
                    .append("startingPoints", req.startingPoints)
                    .append("milestones", req.milestones.map { it.toDocument() })
                    .append("currentPhase", 0)
                    .append("pointsLimit", req.pointsLimit)
                campaigns.insertOne(doc)
                val campaignId = doc.getObjectId("_id").toHexString()
                val playerDoc = Document()
                    .append("campaignId", campaignId)
                    .append("userId", userId)
                    .append("name", username)
                    .append("faction", null as String?)
                    .append("createdAt", now)
                players.insertOne(playerDoc)
                call.respond(HttpStatusCode.Created, doc.toCampaign())
            }

            post("/{id}/request-join") {
                val principal = call.principal<JWTPrincipal>()!!
                val userId = principal.payload.getClaim("userId").asString()
                val username = principal.payload.getClaim("username").asString()
                val campaignId = call.parameters["id"] ?: return@post call.respond(HttpStatusCode.BadRequest)
                val req = call.receive<JoinCampaignRequest>()
                try {
                    val campaignDoc = campaigns.find(Filters.eq("_id", ObjectId(campaignId))).toList().firstOrNull()
                        ?: return@post call.respond(HttpStatusCode.NotFound)
                    val campaign = campaignDoc.toCampaign()
                    if (campaign.members.any { it.userId == userId }) {
                        return@post call.respond(HttpStatusCode.Conflict)
                    }
                    if (campaign.pendingRequests.any { it.userId == userId }) {
                        return@post call.respond(HttpStatusCode.Conflict)
                    }
                    val requestDoc = Document()
                        .append("userId", userId)
                        .append("username", username)
                        .append("commanderName", req.commanderName)
                        .append("faction", req.faction)
                        .append("requestedAt", Instant.now().toString())
                    campaigns.updateOne(
                        Filters.eq("_id", ObjectId(campaignId)),
                        Updates.push("pendingRequests", requestDoc)
                    )
                    call.respond(HttpStatusCode.NoContent)
                } catch (_: IllegalArgumentException) {
                    call.respond(HttpStatusCode.BadRequest)
                }
            }

            get("/{id}/requests") {
                val principal = call.principal<JWTPrincipal>()!!
                val userId = principal.payload.getClaim("userId").asString()
                val campaignId = call.parameters["id"] ?: return@get call.respond(HttpStatusCode.BadRequest)
                try {
                    val campaignDoc = campaigns.find(Filters.eq("_id", ObjectId(campaignId))).toList().firstOrNull()
                        ?: return@get call.respond(HttpStatusCode.NotFound)
                    if (campaignDoc.getString("createdBy") != userId) {
                        return@get call.respond(HttpStatusCode.Forbidden)
                    }
                    val requests = (campaignDoc.getList("pendingRequests", Document::class.java) ?: emptyList())
                        .map { it.toJoinRequest() }
                    call.respond(requests)
                } catch (_: IllegalArgumentException) {
                    call.respond(HttpStatusCode.BadRequest)
                }
            }

            post("/{id}/requests/{requestUserId}/approve") {
                val principal = call.principal<JWTPrincipal>()!!
                val currentUserId = principal.payload.getClaim("userId").asString()
                val campaignId = call.parameters["id"] ?: return@post call.respond(HttpStatusCode.BadRequest)
                val targetUserId = call.parameters["requestUserId"] ?: return@post call.respond(HttpStatusCode.BadRequest)
                try {
                    val campaignDoc = campaigns.find(Filters.eq("_id", ObjectId(campaignId))).toList().firstOrNull()
                        ?: return@post call.respond(HttpStatusCode.NotFound)
                    if (campaignDoc.getString("createdBy") != currentUserId) {
                        return@post call.respond(HttpStatusCode.Forbidden)
                    }
                    val pendingRequests = campaignDoc.getList("pendingRequests", Document::class.java) ?: emptyList()
                    val request = pendingRequests.find { it.getString("userId") == targetUserId }
                        ?: return@post call.respond(HttpStatusCode.NotFound)
                    val now = Instant.now().toString()
                    val memberDoc = Document()
                        .append("userId", targetUserId)
                        .append("commanderName", request.getString("commanderName") ?: "")
                        .append("faction", request.getString("faction"))
                        .append("joinedAt", now)
                    campaigns.updateOne(
                        Filters.eq("_id", ObjectId(campaignId)),
                        Updates.combine(
                            Updates.pull("pendingRequests", Document("userId", targetUserId)),
                            Updates.push("members", memberDoc)
                        )
                    )
                    val playerDoc = Document()
                        .append("campaignId", campaignId)
                        .append("userId", targetUserId)
                        .append("name", request.getString("commanderName") ?: "")
                        .append("faction", request.getString("faction"))
                        .append("createdAt", now)
                    players.insertOne(playerDoc)
                    call.respond(HttpStatusCode.OK)
                } catch (_: IllegalArgumentException) {
                    call.respond(HttpStatusCode.BadRequest)
                }
            }

            post("/{id}/advance-phase") {
                val principal = call.principal<JWTPrincipal>()!!
                val userId = principal.payload.getClaim("userId").asString()
                val campaignId = call.parameters["id"] ?: return@post call.respond(HttpStatusCode.BadRequest)
                try {
                    val campaignDoc = campaigns.find(Filters.eq("_id", ObjectId(campaignId))).toList().firstOrNull()
                        ?: return@post call.respond(HttpStatusCode.NotFound)
                    if (campaignDoc.getString("createdBy") != userId) {
                        return@post call.respond(HttpStatusCode.Forbidden)
                    }
                    val campaign = campaignDoc.toCampaign()
                    if (campaign.currentPhase >= campaign.milestones.size) {
                        return@post call.respond(HttpStatusCode.BadRequest, "Already at last phase")
                    }
                    campaigns.updateOne(
                        Filters.eq("_id", ObjectId(campaignId)),
                        Updates.set("currentPhase", campaign.currentPhase + 1)
                    )
                    val updated = campaigns.find(Filters.eq("_id", ObjectId(campaignId))).toList().first()
                    call.respond(updated.toCampaign())
                } catch (_: IllegalArgumentException) {
                    call.respond(HttpStatusCode.BadRequest)
                }
            }

            post("/{id}/requests/{requestUserId}/reject") {
                val principal = call.principal<JWTPrincipal>()!!
                val currentUserId = principal.payload.getClaim("userId").asString()
                val campaignId = call.parameters["id"] ?: return@post call.respond(HttpStatusCode.BadRequest)
                val targetUserId = call.parameters["requestUserId"] ?: return@post call.respond(HttpStatusCode.BadRequest)
                try {
                    val campaignDoc = campaigns.find(Filters.eq("_id", ObjectId(campaignId))).toList().firstOrNull()
                        ?: return@post call.respond(HttpStatusCode.NotFound)
                    if (campaignDoc.getString("createdBy") != currentUserId) {
                        return@post call.respond(HttpStatusCode.Forbidden)
                    }
                    campaigns.updateOne(
                        Filters.eq("_id", ObjectId(campaignId)),
                        Updates.pull("pendingRequests", Document("userId", targetUserId))
                    )
                    call.respond(HttpStatusCode.OK)
                } catch (_: IllegalArgumentException) {
                    call.respond(HttpStatusCode.BadRequest)
                }
            }
        }
    }
}

fun Document.toMilestone(): com.campaign.model.Milestone = com.campaign.model.Milestone(
    name = getString("name") ?: "",
    points = getInteger("points") ?: 0,
)

fun com.campaign.model.Milestone.toDocument(): Document = Document().append("name", name).append("points", points)

fun Document.toCampaign(): Campaign {
    val memberDocs = getList("members", Document::class.java) ?: emptyList()
    val requestDocs = getList("pendingRequests", Document::class.java) ?: emptyList()
    return Campaign(
        id = getObjectId("_id").toHexString(),
        name = getString("name") ?: "",
        description = getString("description"),
        theme = getString("theme"),
        createdBy = getString("createdBy") ?: "",
        createdByName = getString("createdByName") ?: "",
        members = memberDocs.map { it.toMember() },
        pendingRequests = requestDocs.map { it.toJoinRequest() },
        status = getString("status") ?: "active",
        createdAt = getString("createdAt") ?: Instant.now().toString(),
        type = getString("type") ?: "standard",
        subType = getString("subType"),
        startingPoints = getInteger("startingPoints"),
        milestones = getList("milestones", Document::class.java)?.map { it.toMilestone() } ?: emptyList(),
        currentPhase = getInteger("currentPhase") ?: 0,
        pointsLimit = getInteger("pointsLimit"),
    )
}

fun Document.toMember() = CampaignMember(
    userId = getString("userId") ?: "",
    commanderName = getString("commanderName") ?: "",
    faction = getString("faction"),
    joinedAt = getString("joinedAt") ?: Instant.now().toString(),
)

fun Document.toJoinRequest() = CampaignJoinRequest(
    userId = getString("userId") ?: "",
    username = getString("username") ?: "",
    commanderName = getString("commanderName") ?: "",
    faction = getString("faction"),
    requestedAt = getString("requestedAt") ?: Instant.now().toString(),
)
