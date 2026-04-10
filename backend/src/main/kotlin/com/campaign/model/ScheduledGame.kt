package com.campaign.model

import kotlinx.serialization.Serializable

@Serializable
data class ScheduledGame(
    val id: String,
    val campaignId: String,
    val date: String,
    val player1Id: String,
    val player1Name: String,
    val player2Id: String,
    val player2Name: String,
    val notes: String? = null,
    val createdBy: String? = null,
    val createdAt: String,
)

@Serializable
data class CreateScheduledGameRequest(
    val date: String,
    val player1Id: String,
    val player2Id: String,
    val notes: String? = null,
    val createdBy: String? = null,
)
