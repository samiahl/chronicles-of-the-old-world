package com.campaign.model

import kotlinx.serialization.Serializable

@Serializable
data class Character(
    val id: String,
    val name: String,
    val rank: String? = null,
    val xp: Int? = null,
    val modifiers: String? = null,
    val notes: String? = null,
    val magicalItems: List<String> = emptyList(),
    val isCaster: Boolean = false,
    val misfires: Int = 0,
    val miscasts: Int = 0,
    val perfectInvocations: Int = 0,
    val heroicActions: List<String> = emptyList(),
)

@Serializable
data class ArmyUnit(
    val id: String,
    val name: String,
    val notes: String? = null,
    val xp: Int? = null,
)

@Serializable
data class ArmyList(
    val id: String,
    val campaignId: String? = null,
    val playerId: String,
    val playerName: String,
    val playerFaction: String? = null,
    val name: String,
    val content: String? = null,
    val gameSize: Int? = null,
    val createdAt: String,
    val characters: List<Character> = emptyList(),
    val units: List<ArmyUnit> = emptyList(),
)

@Serializable
data class CreateArmyListRequest(
    val playerId: String,
    val name: String,
    val content: String? = null,
    val gameSize: Int? = null,
)

@Serializable
data class UpdateArmyListRequest(
    val name: String? = null,
    val content: String? = null,
    val gameSize: Int? = null,
    val characters: List<Character>? = null,
    val units: List<ArmyUnit>? = null,
)
