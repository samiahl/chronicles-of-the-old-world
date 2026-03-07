package com.campaign

import com.mongodb.kotlin.client.coroutine.MongoClient
import com.mongodb.kotlin.client.coroutine.MongoDatabase

object DatabaseFactory {
    private val client by lazy {
        val uri = System.getenv("MONGODB_URI") ?: "mongodb://localhost:27017"
        MongoClient.create(uri)
    }

    fun connect(): MongoDatabase = client.getDatabase("warhammer_campaign")
}
