package com.campaign.routes

import com.campaign.model.UserCampaignSummary
import com.mongodb.client.model.Filters
import com.mongodb.kotlin.client.coroutine.MongoDatabase
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.coroutines.flow.toList
import org.bson.Document

fun Route.userRoutes(db: MongoDatabase) {
    val campaigns = db.getCollection<Document>("campaigns")

    get("/user-campaigns") {
        val userId = call.parameters["userId"] ?: return@get call.respond(HttpStatusCode.BadRequest)
        val result = campaigns.find(
            Filters.elemMatch("members", Filters.eq("userId", userId))
        ).toList().map { it.toUserCampaignSummary() }
        call.respond(result)
    }
}

@Suppress("UNCHECKED_CAST")
fun Document.toUserCampaignSummary(): UserCampaignSummary {
    val members = (get("members") as? List<*>)?.filterIsInstance<Document>() ?: emptyList()
    return UserCampaignSummary(
        id = getObjectId("_id").toHexString(),
        name = getString("name") ?: "",
        status = getString("status") ?: "active",
        type = getString("type") ?: "standard",
        membersCount = members.size,
        createdAt = getString("createdAt") ?: "",
    )
}
