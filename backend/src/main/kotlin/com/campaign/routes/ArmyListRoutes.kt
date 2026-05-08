package com.campaign.routes

import com.campaign.model.ArmyList
import com.campaign.model.ArmyUnit
import com.campaign.model.Character
import com.campaign.model.CreateArmyListRequest
import com.campaign.model.UpdateArmyListRequest
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

fun Route.armyListRoutes(db: MongoDatabase) {
    val lists = db.getCollection<Document>("army_lists")
    val players = db.getCollection<Document>("players")

    route("/army-lists") {
        get {
            val campaignId = call.parameters["campaignId"] ?: return@get call.respond(HttpStatusCode.BadRequest)
            val playerMap = players.find(Filters.eq("campaignId", campaignId)).toList()
                .associate { it.getObjectId("_id").toHexString() to it }
            val result = lists.find(Filters.eq("campaignId", campaignId)).toList()
                .sortedByDescending { it.getString("createdAt") }
                .map { it.toArmyList(playerMap) }
            call.respond(result)
        }

        post {
            val campaignId = call.parameters["campaignId"] ?: return@post call.respond(HttpStatusCode.BadRequest)
            val req = call.receive<CreateArmyListRequest>()
            val doc = Document()
                .append("campaignId", campaignId)
                .append("playerId", req.playerId)
                .append("name", req.name)
                .append("faction", req.faction)
                .append("content", req.content)
                .append("gameSize", req.gameSize)
                .append("createdAt", Instant.now().toString())
            lists.insertOne(doc)
            val playerMap = players.find(Filters.eq("campaignId", campaignId)).toList()
                .associate { it.getObjectId("_id").toHexString() to it }
            call.respond(HttpStatusCode.Created, doc.toArmyList(playerMap))
        }

        put("/{id}") {
            val campaignId = call.parameters["campaignId"] ?: return@put call.respond(HttpStatusCode.BadRequest)
            val id = call.parameters["id"] ?: return@put call.respond(HttpStatusCode.BadRequest)
            val req = call.receive<UpdateArmyListRequest>()
            val updates = Document()
            req.name?.let { updates.append("name", it) }
            req.faction?.let { updates.append("faction", it) }
            req.content?.let { updates.append("content", it) }
            req.gameSize?.let { updates.append("gameSize", it) }
            req.characters?.let { updates.append("characters", it.map { c -> c.toDocument() }) }
            req.units?.let { updates.append("units", it.map { u -> u.toDocument() }) }
            if (updates.isNotEmpty()) {
                try {
                    lists.updateOne(Filters.eq("_id", ObjectId(id)), Document("\$set", updates))
                } catch (_: IllegalArgumentException) {
                    return@put call.respond(HttpStatusCode.BadRequest)
                }
            }
            val updated = lists.find(Filters.eq("_id", ObjectId(id))).toList().firstOrNull()
                ?: return@put call.respond(HttpStatusCode.NotFound)
            val playerMap = players.find(Filters.eq("campaignId", campaignId)).toList()
                .associate { it.getObjectId("_id").toHexString() to it }
            call.respond(updated.toArmyList(playerMap))
        }

        delete("/{id}") {
            val id = call.parameters["id"]
                ?: return@delete call.respond(HttpStatusCode.BadRequest)
            try {
                lists.deleteOne(Filters.eq("_id", ObjectId(id)))
                call.respond(HttpStatusCode.NoContent)
            } catch (_: IllegalArgumentException) {
                call.respond(HttpStatusCode.BadRequest)
            }
        }
    }
}

fun Document.toArmyList(playerMap: Map<String, Document>): ArmyList {
    val playerId = getString("playerId") ?: ""
    val player = playerMap[playerId]
    return ArmyList(
        id = getObjectId("_id").toHexString(),
        campaignId = getString("campaignId"),
        playerId = playerId,
        playerName = player?.getString("name") ?: "Unknown",
        playerFaction = player?.getString("faction"),
        name = getString("name") ?: "",
        faction = getString("faction"),
        content = getString("content"),
        gameSize = getInteger("gameSize"),
        createdAt = getString("createdAt") ?: Instant.now().toString(),
        characters = getList("characters", Document::class.java)?.map { it.toCharacter() } ?: emptyList(),
        units = getList("units", Document::class.java)?.map { it.toArmyUnit() } ?: emptyList(),
    )
}

fun Document.toCharacter(): Character = Character(
    id = getString("id") ?: "",
    name = getString("name") ?: "",
    rank = getString("rank"),
    xp = getInteger("xp"),
    modifiers = getString("modifiers"),
    notes = getString("notes"),
    magicalItems = getList("magicalItems", String::class.java) ?: emptyList(),
    isCaster = getBoolean("isCaster") ?: false,
    misfires = getInteger("misfires") ?: 0,
    miscasts = getInteger("miscasts") ?: 0,
    perfectInvocations = getInteger("perfectInvocations") ?: 0,
    heroicActions = getList("heroicActions", String::class.java) ?: emptyList(),
)

fun Character.toDocument(): Document = Document()
    .append("id", id)
    .append("name", name)
    .append("rank", rank)
    .append("xp", xp)
    .append("modifiers", modifiers)
    .append("notes", notes)
    .append("magicalItems", magicalItems)
    .append("isCaster", isCaster)
    .append("misfires", misfires)
    .append("miscasts", miscasts)
    .append("perfectInvocations", perfectInvocations)
    .append("heroicActions", heroicActions)

fun Document.toArmyUnit(): ArmyUnit = ArmyUnit(
    id = getString("id") ?: "",
    name = getString("name") ?: "",
    notes = getString("notes"),
)

fun ArmyUnit.toDocument(): Document = Document()
    .append("id", id)
    .append("name", name)
    .append("notes", notes)
