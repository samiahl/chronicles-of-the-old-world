package com.campaign.routes

import com.campaign.model.ScheduledGame
import com.campaign.model.CreateScheduledGameRequest
import com.mongodb.client.model.Filters
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

fun Route.calendarRoutes(db: MongoDatabase) {
    val scheduled = db.getCollection<Document>("scheduledGames")
    val players = db.getCollection<Document>("players")

    route("/calendar") {
        get {
            val campaignId = call.parameters["campaignId"] ?: return@get call.respond(HttpStatusCode.BadRequest)
            val playerMap = players.find(Filters.eq("campaignId", campaignId)).toList()
                .associate { it.getObjectId("_id").toHexString() to it }
            val result = scheduled.find(Filters.eq("campaignId", campaignId)).toList()
                .sortedBy { it.getString("date") }
                .map { it.toScheduledGame(playerMap) }
            call.respond(result)
        }

        post {
            val campaignId = call.parameters["campaignId"] ?: return@post call.respond(HttpStatusCode.BadRequest)
            val req = call.receive<CreateScheduledGameRequest>()
            val playerMap = players.find(Filters.eq("campaignId", campaignId)).toList()
                .associate { it.getObjectId("_id").toHexString() to it }
            val doc = Document()
                .append("campaignId", campaignId)
                .append("date", req.date)
                .append("player1Id", req.player1Id)
                .append("player2Id", req.player2Id)
                .append("notes", req.notes)
                .append("createdBy", req.createdBy)
                .append("createdAt", Instant.now().toString())
            scheduled.insertOne(doc)
            call.respond(HttpStatusCode.Created, doc.toScheduledGame(playerMap))
        }

        delete("/{id}") {
            val principal = call.principal<JWTPrincipal>()!!
            val userId = principal.payload.getClaim("userId").asString()
            val id = call.parameters["id"] ?: return@delete call.respond(HttpStatusCode.BadRequest)
            try {
                val gameDoc = scheduled.find(Filters.eq("_id", ObjectId(id))).toList().firstOrNull()
                    ?: return@delete call.respond(HttpStatusCode.NotFound)
                val p1Id = gameDoc.getString("player1Id") ?: ""
                val p2Id = gameDoc.getString("player2Id") ?: ""
                val isParticipant = listOf(p1Id, p2Id).any { pid ->
                    if (pid.isEmpty()) false
                    else try {
                        players.find(Filters.eq("_id", ObjectId(pid))).toList().firstOrNull()
                            ?.getString("userId") == userId
                    } catch (_: Exception) { false }
                }
                if (!isParticipant) {
                    return@delete call.respond(HttpStatusCode.Forbidden)
                }
                scheduled.deleteOne(Filters.eq("_id", ObjectId(id)))
            } catch (_: IllegalArgumentException) {
                return@delete call.respond(HttpStatusCode.BadRequest)
            }
            call.respond(HttpStatusCode.NoContent)
        }
    }
}

fun Document.toScheduledGame(playerMap: Map<String, Document>): ScheduledGame {
    val p1Id = getString("player1Id") ?: ""
    val p2Id = getString("player2Id") ?: ""
    val p1 = playerMap[p1Id]
    val p2 = playerMap[p2Id]
    return ScheduledGame(
        id = getObjectId("_id").toHexString(),
        campaignId = getString("campaignId") ?: "",
        date = getString("date") ?: "",
        player1Id = p1Id,
        player1Name = p1?.getString("name") ?: "Unknown",
        player2Id = p2Id,
        player2Name = p2?.getString("name") ?: "Unknown",
        notes = getString("notes"),
        createdBy = getString("createdBy"),
        createdAt = getString("createdAt") ?: Instant.now().toString(),
    )
}
