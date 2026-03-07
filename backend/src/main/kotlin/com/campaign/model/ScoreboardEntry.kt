package com.campaign.model

import kotlinx.serialization.Serializable

@Serializable
data class ScoreboardEntry(
    val id: String,
    val name: String,
    val faction: String? = null,
    val wins: Int = 0,
    val losses: Int = 0,
    val draws: Int = 0,
    val gamesPlayed: Int = 0,
    val points: Int = 0,
    val vpFor: Int = 0,
    val vpAgainst: Int = 0,
)
