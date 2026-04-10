package com.campaign.model

import kotlinx.serialization.Serializable

@Serializable
data class UserCampaignSummary(
    val id: String,
    val name: String,
    val status: String,
    val type: String,
    val membersCount: Int,
    val createdAt: String,
)
