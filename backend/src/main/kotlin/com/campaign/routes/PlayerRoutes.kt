package com.campaign.routes

import com.campaign.model.CreatePlayerRequest
import com.campaign.model.Player
import com.mongodb.client.model.Filters
import com.mongodb.client.model.Updates
import com.mongodb.kotlin.client.coroutine.MongoDatabase
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.coroutines.flow.toList
import org.bson.Document
import org.bson.types.ObjectId
import java.time.Instant

fun Route.playerRoutes(db: MongoDatabase) {
    val col = db.getCollection<Document>("players")
    val campaigns = db.getCollection<Document>("campaigns")
    val users = db.getCollection<Document>("users")

    route("/players") {
        get {
            val campaignId = call.parameters["campaignId"] ?: return@get call.respond(HttpStatusCode.BadRequest)
            val playerDocs = col.find(Filters.eq("campaignId", campaignId)).toList()
                .sortedBy { it.getString("name") }
            val userIds = playerDocs.mapNotNull { it.getString("userId") }.distinct()
            val pictures = if (userIds.isNotEmpty()) {
                users.find(Filters.`in`("_id", userIds.map { ObjectId(it) })).toList()
                    .associate { it.getObjectId("_id").toHexString() to it.getString("profilePicture") }
            } else emptyMap()
            val players = playerDocs.map { it.toPlayer(pictures[it.getString("userId")]) }
            call.respond(players)
        }

        post {
            val campaignId = call.parameters["campaignId"] ?: return@post call.respond(HttpStatusCode.BadRequest)
            val req = call.receive<CreatePlayerRequest>()
            val doc = Document()
                .append("campaignId", campaignId)
                .append("name", req.name)
                .append("faction", req.faction)
                .append("createdAt", Instant.now().toString())
            col.insertOne(doc)
            call.respond(HttpStatusCode.Created, doc.toPlayer())
        }

        delete("/{id}") {
            val id = call.parameters["id"]
                ?: return@delete call.respond(HttpStatusCode.BadRequest)
            try {
                val playerDoc = col.find(Filters.eq("_id", ObjectId(id))).toList().firstOrNull()
                if (playerDoc != null) {
                    val playerUserId = playerDoc.getString("userId")
                    val campaignId = playerDoc.getString("campaignId")
                    if (playerUserId != null && campaignId != null) {
                        campaigns.updateOne(
                            Filters.eq("_id", ObjectId(campaignId)),
                            Updates.pull("members", Document("userId", playerUserId))
                        )
                    }
                }
                col.updateOne(Filters.eq("_id", ObjectId(id)), Updates.set("inactive", true))
                call.respond(HttpStatusCode.NoContent)
            } catch (_: IllegalArgumentException) {
                call.respond(HttpStatusCode.BadRequest)
            }
        }
    }
}

fun Document.toPlayer(profilePicture: String? = null) = Player(
    id = getObjectId("_id").toHexString(),
    name = getString("name") ?: "",
    faction = getString("faction"),
    campaignId = getString("campaignId"),
    userId = getString("userId"),
    createdAt = getString("createdAt") ?: Instant.now().toString(),
    inactive = getBoolean("inactive") ?: false,
    profilePicture = profilePicture,
)
