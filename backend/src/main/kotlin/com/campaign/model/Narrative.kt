package com.campaign.model

import kotlinx.serialization.Serializable

@Serializable
data class Narrative(
    val id: String,
    val campaignId: String? = null,
    val battleId: String? = null,
    val battleDate: String? = null,
    val player1Name: String? = null,
    val player2Name: String? = null,
    val title: String,
    val content: String,
    val author: String? = null,
    val createdAt: String,
)

@Serializable
data class CreateNarrativeRequest(
    val battleId: String? = null,
    val title: String,
    val content: String,
    val author: String? = null,
)
