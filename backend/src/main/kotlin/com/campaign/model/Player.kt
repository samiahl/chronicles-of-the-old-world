package com.campaign.model

import kotlinx.serialization.Serializable

@Serializable
data class Player(
    val id: String,
    val name: String,
    val faction: String? = null,
    val campaignId: String? = null,
    val userId: String? = null,
    val createdAt: String,
    val inactive: Boolean = false,
)

@Serializable
data class CreatePlayerRequest(
    val name: String,
    val faction: String? = null,
)
