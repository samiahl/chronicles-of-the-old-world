package com.campaign.routes

import com.mongodb.kotlin.client.coroutine.MongoDatabase
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.routing.*

fun Application.configureRouting(db: MongoDatabase, jwtSecret: String, jwtIssuer: String, jwtAudience: String) {
    routing {
        route("/api") {
            authRoutes(db, jwtSecret, jwtIssuer, jwtAudience)
            campaignRoutes(db)

            authenticate("auth-jwt") {
                route("/campaigns/{campaignId}") {
                    playerRoutes(db)
                    battleRoutes(db)
                    armyListRoutes(db)
                    narrativeRoutes(db)
                    scoreboardRoutes(db)
                }
            }
        }
    }
}
