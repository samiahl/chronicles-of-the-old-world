package com.campaign.model

import kotlinx.serialization.Serializable

@Serializable
data class Battle(
    val id: String,
    val campaignId: String? = null,
    val date: String,
    val player1Id: String,
    val player1Name: String,
    val player1Faction: String? = null,
    val player2Id: String,
    val player2Name: String,
    val player2Faction: String? = null,
    val scenario: String? = null,
    val gameSize: Int? = null,
    val result: String,           // "player1" | "player2" | "draw"
    val player1Vp: Int = 0,
    val player2Vp: Int = 0,
    val player1Report: String? = null,
    val player2Report: String? = null,
    val openPoints1: Int? = null,   // manually assigned narrative points for player 1
    val openPoints2: Int? = null,   // manually assigned narrative points for player 2
    val imageUrls: List<String> = emptyList(),  // Cloudinary URLs (not yet implemented)
    val notes: String? = null,
    val createdAt: String,
)

@Serializable
data class CreateBattleRequest(
    val date: String,
    val player1Id: String,
    val player2Id: String,
    val scenario: String? = null,
    val gameSize: Int? = null,
    val result: String,
    val player1Vp: Int = 0,
    val player2Vp: Int = 0,
    val player1Report: String? = null,
    val player2Report: String? = null,
    val openPoints1: Int? = null,
    val openPoints2: Int? = null,
    val imageUrls: List<String> = emptyList(),  // Cloudinary URLs (not yet implemented)
    val notes: String? = null,
)

@Serializable
data class UpdateBattleRequest(
    val player1Report: String? = null,
    val player2Report: String? = null,
    val scenario: String? = null,
    val gameSize: Int? = null,
    val openPoints1: Int? = null,
    val openPoints2: Int? = null,
    val imageUrls: List<String>? = null,  // Cloudinary URLs (not yet implemented)
    val notes: String? = null,
)
