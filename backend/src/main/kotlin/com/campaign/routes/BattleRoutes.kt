package com.campaign.routes

import com.campaign.model.Battle
import com.campaign.model.CreateBattleRequest
import com.campaign.model.UpdateBattleRequest
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

fun Route.battleRoutes(db: MongoDatabase) {
    val battles = db.getCollection<Document>("battles")
    val players = db.getCollection<Document>("players")

    route("/battles") {
        get {
            val campaignId = call.parameters["campaignId"] ?: return@get call.respond(HttpStatusCode.BadRequest)
            val playerMap = players.find(Filters.eq("campaignId", campaignId)).toList()
                .associate { it.getObjectId("_id").toHexString() to it }
            val result = battles.find(Filters.eq("campaignId", campaignId)).toList()
                .sortedWith(compareByDescending<Document> { it.getString("date") }
                    .thenByDescending { it.getString("createdAt") })
                .map { it.toBattle(playerMap) }
            call.respond(result)
        }

        get("/{id}") {
            val campaignId = call.parameters["campaignId"] ?: return@get call.respond(HttpStatusCode.BadRequest)
            val id = call.parameters["id"] ?: return@get call.respond(HttpStatusCode.BadRequest)
            val battle = battles.find(Filters.eq("_id", ObjectId(id))).toList().firstOrNull()
                ?: return@get call.respond(HttpStatusCode.NotFound)
            val playerMap = players.find(Filters.eq("campaignId", campaignId)).toList()
                .associate { it.getObjectId("_id").toHexString() to it }
            call.respond(battle.toBattle(playerMap))
        }

        post {
            val campaignId = call.parameters["campaignId"] ?: return@post call.respond(HttpStatusCode.BadRequest)
            val req = call.receive<CreateBattleRequest>()
            val doc = Document()
                .append("campaignId", campaignId)
                .append("date", req.date)
                .append("player1Id", req.player1Id)
                .append("player2Id", req.player2Id)
                .append("scenario", req.scenario)
                .append("gameSize", req.gameSize)
                .append("result", req.result)
                .append("player1Vp", req.player1Vp)
                .append("player2Vp", req.player2Vp)
                .append("player1Report", req.player1Report)
                .append("player2Report", req.player2Report)
                .append("openPoints1", req.openPoints1)
                .append("openPoints2", req.openPoints2)
                .append("imageUrls", req.imageUrls)
                .append("notes", req.notes)
                .append("createdAt", Instant.now().toString())
            battles.insertOne(doc)
            val playerMap = players.find(Filters.eq("campaignId", campaignId)).toList()
                .associate { it.getObjectId("_id").toHexString() to it }
            call.respond(HttpStatusCode.Created, doc.toBattle(playerMap))
        }

        put("/{id}") {
            val campaignId = call.parameters["campaignId"] ?: return@put call.respond(HttpStatusCode.BadRequest)
            val id = call.parameters["id"] ?: return@put call.respond(HttpStatusCode.BadRequest)
            val req = call.receive<UpdateBattleRequest>()
            val updates = Document()
            req.player1Report?.let { updates.append("player1Report", it) }
            req.player2Report?.let { updates.append("player2Report", it) }
            req.scenario?.let { updates.append("scenario", it) }
            req.gameSize?.let { updates.append("gameSize", it) }
            req.openPoints1?.let { updates.append("openPoints1", it) }
            req.openPoints2?.let { updates.append("openPoints2", it) }
            req.imageUrls?.let { updates.append("imageUrls", it) }
            req.notes?.let { updates.append("notes", it) }
            if (updates.isNotEmpty()) {
                try {
                    battles.updateOne(Filters.eq("_id", ObjectId(id)), Document("\$set", updates))
                } catch (_: IllegalArgumentException) {
                    return@put call.respond(HttpStatusCode.BadRequest)
                }
            }
            val updated = battles.find(Filters.eq("_id", ObjectId(id))).toList().firstOrNull()
                ?: return@put call.respond(HttpStatusCode.NotFound)
            val playerMap = players.find(Filters.eq("campaignId", campaignId)).toList()
                .associate { it.getObjectId("_id").toHexString() to it }
            call.respond(updated.toBattle(playerMap))
        }
    }
}

@Suppress("UNCHECKED_CAST")
fun Document.toBattle(playerMap: Map<String, Document>): Battle {
    val p1Id = getString("player1Id") ?: ""
    val p2Id = getString("player2Id") ?: ""
    val p1 = playerMap[p1Id]
    val p2 = playerMap[p2Id]
    return Battle(
        id = getObjectId("_id").toHexString(),
        campaignId = getString("campaignId"),
        date = getString("date") ?: "",
        player1Id = p1Id,
        player1Name = p1?.getString("name") ?: getString("player1Name") ?: "Unknown",
        player1Faction = p1?.getString("faction"),
        player2Id = p2Id,
        player2Name = p2?.getString("name") ?: getString("player2Name") ?: "Unknown",
        player2Faction = p2?.getString("faction"),
        scenario = getString("scenario"),
        gameSize = getInteger("gameSize"),
        result = getString("result") ?: "draw",
        player1Vp = getInteger("player1Vp") ?: 0,
        player2Vp = getInteger("player2Vp") ?: 0,
        player1Report = getString("player1Report"),
        player2Report = getString("player2Report"),
        openPoints1 = getInteger("openPoints1"),
        openPoints2 = getInteger("openPoints2"),
        imageUrls = (get("imageUrls") as? List<*>)?.filterIsInstance<String>() ?: emptyList(),
        notes = getString("notes"),
        createdAt = getString("createdAt") ?: Instant.now().toString(),
    )
}
