package com.campaign

import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm
import com.campaign.routes.configureRouting
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.auth.jwt.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.plugins.cors.routing.*
import kotlinx.serialization.json.Json

fun main() {
    embeddedServer(Netty, port = 8080, host = "0.0.0.0", module = Application::module)
        .start(wait = true)
}

fun Application.module() {
    val jwtSecret = System.getenv("JWT_SECRET") ?: "dev-secret-change-in-production"
    val jwtIssuer = "blood-and-glory"
    val jwtAudience = "blood-and-glory-users"

    install(ContentNegotiation) {
        json(Json {
            prettyPrint = true
            isLenient = true
            ignoreUnknownKeys = true
            encodeDefaults = true
        })
    }

    install(CORS) {
        anyHost()
        allowHeader(HttpHeaders.ContentType)
        allowHeader(HttpHeaders.Authorization)
        allowMethod(HttpMethod.Delete)
        allowMethod(HttpMethod.Put)
        allowMethod(HttpMethod.Patch)
        allowMethod(HttpMethod.Options)
    }

    install(Authentication) {
        jwt("auth-jwt") {
            realm = "Blood and Glory"
            verifier(
                JWT.require(Algorithm.HMAC256(jwtSecret))
                    .withAudience(jwtAudience)
                    .withIssuer(jwtIssuer)
                    .build()
            )
            validate { credential ->
                val userId = credential.payload.getClaim("userId").asString()
                if (userId != null && userId.isNotEmpty()) JWTPrincipal(credential.payload) else null
            }
        }
    }

    val db = DatabaseFactory.connect()
    configureRouting(db, jwtSecret, jwtIssuer, jwtAudience)
}
