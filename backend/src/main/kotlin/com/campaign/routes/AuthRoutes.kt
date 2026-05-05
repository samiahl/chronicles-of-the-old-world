package com.campaign.routes

import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm
import com.campaign.model.*
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
import org.mindrot.jbcrypt.BCrypt
import java.time.Instant
import java.util.*

fun Route.authRoutes(db: MongoDatabase, jwtSecret: String, jwtIssuer: String, jwtAudience: String) {
    val users = db.getCollection<Document>("users")

    route("/auth") {
        post("/register") {
            val req = call.receive<RegisterRequest>()
            if (req.username.isBlank() || req.password.isBlank()) {
                return@post call.respond(HttpStatusCode.BadRequest)
            }
            val existing = users.find(Filters.eq("username", req.username)).toList().firstOrNull()
            if (existing != null) {
                return@post call.respond(HttpStatusCode.Conflict)
            }
            val hash = BCrypt.hashpw(req.password, BCrypt.gensalt())
            val now = Instant.now().toString()
            val doc = Document()
                .append("username", req.username)
                .append("passwordHash", hash)
                .append("profilePicture", null as String?)
                .append("createdAt", now)
            users.insertOne(doc)
            val userId = doc.getObjectId("_id").toHexString()
            val token = makeToken(userId, req.username, jwtSecret, jwtIssuer, jwtAudience)
            val userPublic = UserPublic(id = userId, username = req.username, profilePicture = null, createdAt = now)
            call.respond(HttpStatusCode.Created, AuthResponse(token = token, user = userPublic))
        }

        post("/login") {
            val req = call.receive<LoginRequest>()
            val userDoc = users.find(Filters.eq("username", req.username)).toList().firstOrNull()
                ?: return@post call.respond(HttpStatusCode.Unauthorized)
            val hash = userDoc.getString("passwordHash") ?: ""
            if (!BCrypt.checkpw(req.password, hash)) {
                return@post call.respond(HttpStatusCode.Unauthorized)
            }
            val userId = userDoc.getObjectId("_id").toHexString()
            val username = userDoc.getString("username") ?: ""
            val token = makeToken(userId, username, jwtSecret, jwtIssuer, jwtAudience)
            val userPublic = UserPublic(
                id = userId,
                username = username,
                profilePicture = userDoc.getString("profilePicture"),
                createdAt = userDoc.getString("createdAt") ?: Instant.now().toString(),
            )
            call.respond(AuthResponse(token = token, user = userPublic))
        }

        authenticate("auth-jwt") {
            get("/me") {
                val principal = call.principal<JWTPrincipal>()!!
                val userId = principal.payload.getClaim("userId").asString()
                val userDoc = users.find(Filters.eq("_id", ObjectId(userId))).toList().firstOrNull()
                    ?: return@get call.respond(HttpStatusCode.NotFound)
                call.respond(userDoc.toUserPublic())
            }

            put("/me") {
                val principal = call.principal<JWTPrincipal>()!!
                val userId = principal.payload.getClaim("userId").asString()
                val req = call.receive<UpdateProfileRequest>()
                if (req.username != null) {
                    if (req.username.isBlank()) return@put call.respond(HttpStatusCode.BadRequest)
                    val existing = users.find(Filters.eq("username", req.username)).toList().firstOrNull()
                    if (existing != null && existing.getObjectId("_id").toHexString() != userId) {
                        return@put call.respond(HttpStatusCode.Conflict)
                    }
                    users.updateOne(
                        Filters.eq("_id", ObjectId(userId)),
                        Document("\$set", Document("username", req.username))
                    )
                }
                if (!req.password.isNullOrBlank()) {
                    val hash = BCrypt.hashpw(req.password, BCrypt.gensalt())
                    users.updateOne(
                        Filters.eq("_id", ObjectId(userId)),
                        Document("\$set", Document("passwordHash", hash))
                    )
                }
                val userDoc = users.find(Filters.eq("_id", ObjectId(userId))).toList().firstOrNull()
                    ?: return@put call.respond(HttpStatusCode.NotFound)
                val newUsername = userDoc.getString("username") ?: ""
                val token = makeToken(userId, newUsername, jwtSecret, jwtIssuer, jwtAudience)
                call.respond(AuthResponse(token = token, user = userDoc.toUserPublic()))
            }

            put("/me/avatar") {
                val principal = call.principal<JWTPrincipal>()!!
                val userId = principal.payload.getClaim("userId").asString()
                val req = call.receive<UpdateAvatarRequest>()
                users.updateOne(
                    Filters.eq("_id", ObjectId(userId)),
                    Document("\$set", Document("profilePicture", req.picture))
                )
                val userDoc = users.find(Filters.eq("_id", ObjectId(userId))).toList().firstOrNull()
                    ?: return@put call.respond(HttpStatusCode.NotFound)
                call.respond(userDoc.toUserPublic())
            }
        }
    }
}

fun makeToken(userId: String, username: String, secret: String, issuer: String, audience: String): String =
    JWT.create()
        .withAudience(audience)
        .withIssuer(issuer)
        .withClaim("userId", userId)
        .withClaim("username", username)
        .withExpiresAt(Date(System.currentTimeMillis() + 30L * 24 * 60 * 60 * 1000))
        .sign(Algorithm.HMAC256(secret))

fun Document.toUserPublic() = UserPublic(
    id = getObjectId("_id").toHexString(),
    username = getString("username") ?: "",
    profilePicture = getString("profilePicture"),
    createdAt = getString("createdAt") ?: Instant.now().toString(),
)
