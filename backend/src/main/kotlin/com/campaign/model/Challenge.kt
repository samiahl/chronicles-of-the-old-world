package com.campaign.model

import kotlinx.serialization.Serializable

@Serializable
data class Challenge(
    val id: String,
    val campaignId: String,
    val fromPlayerId: String,
    val fromPlayerName: String,
    val toPlayerId: String,
    val toPlayerName: String,
    val message: String,
    val status: String = "open",   // open | accepted | declined | resolved
    val createdAt: String,
)

@Serializable
data class CreateChallengeRequest(
    val fromPlayerId: String,
    val toPlayerId: String,
    val message: String,
)

@Serializable
data class UpdateChallengeStatusRequest(
    val status: String,
)
