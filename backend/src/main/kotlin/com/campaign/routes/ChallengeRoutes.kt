package com.campaign.routes

import com.campaign.model.Challenge
import com.campaign.model.CreateChallengeRequest
import com.campaign.model.UpdateChallengeStatusRequest
import com.mongodb.client.model.Filters
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

fun Route.challengeRoutes(db: MongoDatabase) {
    val challenges = db.getCollection<Document>("challenges")
    val players    = db.getCollection<Document>("players")

    route("/challenges") {
        get {
            val campaignId = call.parameters["campaignId"] ?: return@get call.respond(HttpStatusCode.BadRequest)
            val result = challenges.find(Filters.eq("campaignId", campaignId)).toList()
                .sortedByDescending { it.getString("createdAt") }
                .map { it.toChallenge() }
            call.respond(result)
        }

        post {
            val campaignId = call.parameters["campaignId"] ?: return@post call.respond(HttpStatusCode.BadRequest)
            val req = call.receive<CreateChallengeRequest>()
            val playerMap = players.find(Filters.eq("campaignId", campaignId)).toList()
                .associate { it.getObjectId("_id").toHexString() to it.getString("name") }
            val fromName = playerMap[req.fromPlayerId] ?: return@post call.respond(HttpStatusCode.BadRequest)
            val toName   = playerMap[req.toPlayerId]   ?: return@post call.respond(HttpStatusCode.BadRequest)
            val doc = Document()
                .append("campaignId", campaignId)
                .append("fromPlayerId", req.fromPlayerId)
                .append("fromPlayerName", fromName)
                .append("toPlayerId", req.toPlayerId)
                .append("toPlayerName", toName)
                .append("message", req.message)
                .append("status", "open")
                .append("createdAt", Instant.now().toString())
            challenges.insertOne(doc)
            call.respond(HttpStatusCode.Created, doc.toChallenge())
        }

        put("/{id}") {
            val id  = call.parameters["id"] ?: return@put call.respond(HttpStatusCode.BadRequest)
            val req = call.receive<UpdateChallengeStatusRequest>()
            val validStatuses = setOf("open", "accepted", "declined", "resolved")
            if (req.status !in validStatuses) return@put call.respond(HttpStatusCode.BadRequest)
            try {
                challenges.updateOne(
                    Filters.eq("_id", ObjectId(id)),
                    Document("\$set", Document("status", req.status))
                )
            } catch (_: IllegalArgumentException) {
                return@put call.respond(HttpStatusCode.BadRequest)
            }
            val updated = challenges.find(Filters.eq("_id", ObjectId(id))).toList().firstOrNull()
                ?: return@put call.respond(HttpStatusCode.NotFound)
            call.respond(updated.toChallenge())
        }

        delete("/{id}") {
            val id = call.parameters["id"] ?: return@delete call.respond(HttpStatusCode.BadRequest)
            try {
                challenges.deleteOne(Filters.eq("_id", ObjectId(id)))
            } catch (_: IllegalArgumentException) {
                return@delete call.respond(HttpStatusCode.BadRequest)
            }
            call.respond(HttpStatusCode.NoContent)
        }
    }
}

fun Document.toChallenge() = Challenge(
    id             = getObjectId("_id").toHexString(),
    campaignId     = getString("campaignId") ?: "",
    fromPlayerId   = getString("fromPlayerId") ?: "",
    fromPlayerName = getString("fromPlayerName") ?: "",
    toPlayerId     = getString("toPlayerId") ?: "",
    toPlayerName   = getString("toPlayerName") ?: "",
    message        = getString("message") ?: "",
    status         = getString("status") ?: "open",
    createdAt      = getString("createdAt") ?: Instant.now().toString(),
)
