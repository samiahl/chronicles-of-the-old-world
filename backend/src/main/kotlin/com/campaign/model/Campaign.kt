package com.campaign.model

import kotlinx.serialization.Serializable

@Serializable
data class Milestone(val name: String, val points: Int)

@Serializable
data class Campaign(
    val id: String,
    val name: String,
    val description: String? = null,
    val theme: String? = null,
    val createdBy: String,
    val createdByName: String,
    val members: List<CampaignMember> = emptyList(),
    val pendingRequests: List<CampaignJoinRequest> = emptyList(),
    val status: String = "active",
    val createdAt: String,
    val type: String = "standard",
    val subType: String? = null,
    val startingPoints: Int? = null,
    val milestones: List<Milestone> = emptyList(),
    val currentPhase: Int = 0,
    val pointsLimit: Int? = null,
)

@Serializable
data class CampaignMember(
    val userId: String,
    val commanderName: String,
    val faction: String? = null,
    val joinedAt: String,
)

@Serializable
data class CampaignJoinRequest(
    val userId: String,
    val username: String,
    val commanderName: String,
    val faction: String? = null,
    val requestedAt: String,
)

@Serializable
data class CreateCampaignRequest(
    val name: String,
    val description: String? = null,
    val theme: String? = null,
    val type: String = "standard",
    val subType: String? = null,
    val startingPoints: Int? = null,
    val milestones: List<Milestone> = emptyList(),
    val pointsLimit: Int? = null,
)

@Serializable
data class JoinCampaignRequest(
    val commanderName: String,
    val faction: String? = null,
)
