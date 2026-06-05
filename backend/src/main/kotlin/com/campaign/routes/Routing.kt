package com.campaign.routes

import com.mongodb.kotlin.client.coroutine.MongoDatabase
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun Application.configureRouting(db: MongoDatabase, jwtSecret: String, jwtIssuer: String, jwtAudience: String) {
    routing {
        get("/health") {
            call.respond(HttpStatusCode.OK)
        }

        route("/api") {
            authRoutes(db, jwtSecret, jwtIssuer, jwtAudience)
            campaignRoutes(db)

            authenticate("auth-jwt") {
                userRoutes(db)

                route("/campaigns/{campaignId}") {
                    playerRoutes(db)
                    battleRoutes(db)
                    armyListRoutes(db)
                    narrativeRoutes(db)
                    scoreboardRoutes(db)
                    calendarRoutes(db)
                    challengeRoutes(db)
                }
            }
        }
    }
}
