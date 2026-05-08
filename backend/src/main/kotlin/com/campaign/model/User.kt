package com.campaign.model

import kotlinx.serialization.Serializable

@Serializable
data class User(
    val id: String,
    val username: String,
    val passwordHash: String,
    val profilePicture: String? = null,
    val createdAt: String,
)

@Serializable
data class UserPublic(
    val id: String,
    val username: String,
    val profilePicture: String? = null,
    val createdAt: String,
)

@Serializable
data class RegisterRequest(
    val username: String,
    val password: String,
)

@Serializable
data class LoginRequest(
    val username: String,
    val password: String,
)

@Serializable
data class AuthResponse(
    val token: String,
    val user: UserPublic,
)

@Serializable
data class UpdateAvatarRequest(
    val picture: String,  // Cloudinary URL
)

@Serializable
data class UpdateProfileRequest(
    val username: String? = null,
    val password: String? = null,
)
