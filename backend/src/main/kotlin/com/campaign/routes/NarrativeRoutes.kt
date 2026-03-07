package com.campaign.routes

import com.campaign.model.CreateNarrativeRequest
import com.campaign.model.Narrative
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

fun Route.narrativeRoutes(db: MongoDatabase) {
    val narratives = db.getCollection<Document>("narratives")
    val battles = db.getCollection<Document>("battles")
    val players = db.getCollection<Document>("players")

    route("/narratives") {
        get {
            val campaignId = call.parameters["campaignId"] ?: return@get call.respond(HttpStatusCode.BadRequest)
            val playerMap = players.find(Filters.eq("campaignId", campaignId)).toList()
                .associate { it.getObjectId("_id").toHexString() to it }
            val battleMap = battles.find(Filters.eq("campaignId", campaignId)).toList()
                .associate { it.getObjectId("_id").toHexString() to it }
            val result = narratives.find(Filters.eq("campaignId", campaignId)).toList()
                .sortedByDescending { it.getString("createdAt") }
                .map { it.toNarrative(battleMap, playerMap) }
            call.respond(result)
        }

        post {
            val campaignId = call.parameters["campaignId"] ?: return@post call.respond(HttpStatusCode.BadRequest)
            val req = call.receive<CreateNarrativeRequest>()
            val doc = Document()
                .append("campaignId", campaignId)
                .append("battleId", req.battleId)
                .append("title", req.title)
                .append("content", req.content)
                .append("author", req.author)
                .append("createdAt", Instant.now().toString())
            narratives.insertOne(doc)
            val playerMap = players.find(Filters.eq("campaignId", campaignId)).toList()
                .associate { it.getObjectId("_id").toHexString() to it }
            val battleMap = battles.find(Filters.eq("campaignId", campaignId)).toList()
                .associate { it.getObjectId("_id").toHexString() to it }
            call.respond(HttpStatusCode.Created, doc.toNarrative(battleMap, playerMap))
        }

        delete("/{id}") {
            val id = call.parameters["id"]
                ?: return@delete call.respond(HttpStatusCode.BadRequest)
            try {
                narratives.deleteOne(Filters.eq("_id", ObjectId(id)))
                call.respond(HttpStatusCode.NoContent)
            } catch (_: IllegalArgumentException) {
                call.respond(HttpStatusCode.BadRequest)
            }
        }
    }
}

fun Document.toNarrative(battleMap: Map<String, Document>, playerMap: Map<String, Document>): Narrative {
    val battleId = getString("battleId")
    val battle = battleId?.let { battleMap[it] }
    val p1Id = battle?.getString("player1Id")
    val p2Id = battle?.getString("player2Id")
    return Narrative(
        id = getObjectId("_id").toHexString(),
        campaignId = getString("campaignId"),
        battleId = battleId,
        battleDate = battle?.getString("date"),
        player1Name = p1Id?.let { playerMap[it]?.getString("name") },
        player2Name = p2Id?.let { playerMap[it]?.getString("name") },
        title = getString("title") ?: "",
        content = getString("content") ?: "",
        author = getString("author"),
        createdAt = getString("createdAt") ?: Instant.now().toString(),
    )
}
