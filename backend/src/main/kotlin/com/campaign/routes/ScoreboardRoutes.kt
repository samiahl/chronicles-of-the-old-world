package com.campaign.routes

import com.campaign.model.ScoreboardEntry
import com.mongodb.client.model.Filters
import com.mongodb.kotlin.client.coroutine.MongoDatabase
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.coroutines.flow.toList
import org.bson.Document

fun Route.scoreboardRoutes(db: MongoDatabase) {
    val players = db.getCollection<Document>("players")
    val battles = db.getCollection<Document>("battles")

    get("/scoreboard") {
        val campaignId = call.parameters["campaignId"] ?: return@get call.respond(HttpStatusCode.BadRequest)
        val allPlayers = players.find(Filters.eq("campaignId", campaignId)).toList()
        val allBattles = battles.find(Filters.eq("campaignId", campaignId)).toList()

        val scores = allPlayers.associate { p ->
            p.getObjectId("_id").toHexString() to ScoreboardEntry(
                id = p.getObjectId("_id").toHexString(),
                name = p.getString("name") ?: "",
                faction = p.getString("faction"),
            )
        }.toMutableMap()

        for (battle in allBattles) {
            val p1Id = battle.getString("player1Id") ?: continue
            val p2Id = battle.getString("player2Id") ?: continue
            val p1 = scores[p1Id] ?: continue
            val p2 = scores[p2Id] ?: continue
            val result = battle.getString("result") ?: continue
            val p1Vp = battle.getInteger("player1Vp") ?: 0
            val p2Vp = battle.getInteger("player2Vp") ?: 0
            // Narrative points are manually assigned per battle — wins give no automatic points
            val p1Pts = battle.getInteger("openPoints1") ?: 0
            val p2Pts = battle.getInteger("openPoints2") ?: 0

            val (newP1, newP2) = when (result) {
                "player1" -> Pair(
                    p1.copy(wins = p1.wins + 1, points = p1.points + p1Pts,
                        gamesPlayed = p1.gamesPlayed + 1, vpFor = p1.vpFor + p1Vp, vpAgainst = p1.vpAgainst + p2Vp),
                    p2.copy(losses = p2.losses + 1, points = p2.points + p2Pts,
                        gamesPlayed = p2.gamesPlayed + 1, vpFor = p2.vpFor + p2Vp, vpAgainst = p2.vpAgainst + p1Vp),
                )
                "player2" -> Pair(
                    p1.copy(losses = p1.losses + 1, points = p1.points + p1Pts,
                        gamesPlayed = p1.gamesPlayed + 1, vpFor = p1.vpFor + p1Vp, vpAgainst = p1.vpAgainst + p2Vp),
                    p2.copy(wins = p2.wins + 1, points = p2.points + p2Pts,
                        gamesPlayed = p2.gamesPlayed + 1, vpFor = p2.vpFor + p2Vp, vpAgainst = p2.vpAgainst + p1Vp),
                )
                "draw" -> Pair(
                    p1.copy(draws = p1.draws + 1, points = p1.points + p1Pts,
                        gamesPlayed = p1.gamesPlayed + 1, vpFor = p1.vpFor + p1Vp, vpAgainst = p1.vpAgainst + p2Vp),
                    p2.copy(draws = p2.draws + 1, points = p2.points + p2Pts,
                        gamesPlayed = p2.gamesPlayed + 1, vpFor = p2.vpFor + p2Vp, vpAgainst = p2.vpAgainst + p1Vp),
                )
                else -> Pair(p1, p2)
            }
            scores[p1Id] = newP1
            scores[p2Id] = newP2
        }

        val scoreboard = scores.values.sortedWith(
            compareByDescending<ScoreboardEntry> { it.points }
                .thenByDescending { it.wins }
                .thenByDescending { it.vpFor - it.vpAgainst }
                .thenBy { it.name }
        )
        call.respond(scoreboard)
    }
}
