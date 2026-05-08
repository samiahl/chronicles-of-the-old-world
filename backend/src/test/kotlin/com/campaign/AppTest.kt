package com.campaign

import de.flapdoodle.embed.mongo.distribution.Version
import de.flapdoodle.embed.mongo.transitions.Mongod
import de.flapdoodle.embed.mongo.transitions.RunningMongodProcess
import de.flapdoodle.reverse.TransitionWalker
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.testing.*
import kotlinx.serialization.json.*
import org.junit.jupiter.api.AfterAll
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.TestInstance
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class AppTest {

    private lateinit var runningMongo: TransitionWalker.ReachedState<RunningMongodProcess>

    @BeforeAll
    fun startMongo() {
        runningMongo = Mongod.instance().start(Version.V7_0_4)
        val address = runningMongo.current().serverAddress
        val uri = "mongodb://${address.host}:${address.port}"
        injectEnvVar("MONGODB_URI", uri)
        injectEnvVar("JWT_SECRET", "test-secret-for-unit-tests")
    }

    @AfterAll
    fun stopMongo() {
        runningMongo.close()
    }

    // -------------------------------------------------------------------------
    // Tests
    // -------------------------------------------------------------------------

    @Test
    fun `POST register with valid body returns 201 and token`() = testApplication {
        application { module() }
        val response = client.post("/api/auth/register") {
            contentType(ContentType.Application.Json)
            setBody("""{"username":"testuser","password":"password123"}""")
        }
        assertEquals(HttpStatusCode.Created, response.status)
        val body = Json.parseToJsonElement(response.bodyAsText()).jsonObject
        val token = body["token"]?.jsonPrimitive?.content
        assertNotNull(token)
        assertTrue(token.isNotBlank())
    }

    @Test
    fun `POST login with wrong password returns 401`() = testApplication {
        application { module() }
        client.post("/api/auth/register") {
            contentType(ContentType.Application.Json)
            setBody("""{"username":"loginuser","password":"correct-pass"}""")
        }
        val response = client.post("/api/auth/login") {
            contentType(ContentType.Application.Json)
            setBody("""{"username":"loginuser","password":"wrong-pass"}""")
        }
        assertEquals(HttpStatusCode.Unauthorized, response.status)
    }

    @Test
    fun `POST campaigns without Authorization header returns 401`() = testApplication {
        application { module() }
        val response = client.post("/api/campaigns") {
            contentType(ContentType.Application.Json)
            setBody("""{"name":"My Campaign","milestones":[]}""")
        }
        assertEquals(HttpStatusCode.Unauthorized, response.status)
    }

    @Test
    fun `PUT campaigns by non-creator returns 403`() = testApplication {
        application { module() }

        // Register creator and get token
        val creatorReg = client.post("/api/auth/register") {
            contentType(ContentType.Application.Json)
            setBody("""{"username":"creator","password":"pass"}""")
        }
        val creatorToken = Json.parseToJsonElement(creatorReg.bodyAsText())
            .jsonObject["token"]!!.jsonPrimitive.content

        // Creator creates a campaign
        val campaignRes = client.post("/api/campaigns") {
            contentType(ContentType.Application.Json)
            header(HttpHeaders.Authorization, "Bearer $creatorToken")
            setBody("""{"name":"Epic Campaign","milestones":[]}""")
        }
        val campaignId = Json.parseToJsonElement(campaignRes.bodyAsText())
            .jsonObject["id"]!!.jsonPrimitive.content

        // Register a second user
        val otherReg = client.post("/api/auth/register") {
            contentType(ContentType.Application.Json)
            setBody("""{"username":"interloper","password":"pass"}""")
        }
        val otherToken = Json.parseToJsonElement(otherReg.bodyAsText())
            .jsonObject["token"]!!.jsonPrimitive.content

        // Other user tries to update the campaign — must get 403
        val updateRes = client.put("/api/campaigns/$campaignId") {
            contentType(ContentType.Application.Json)
            header(HttpHeaders.Authorization, "Bearer $otherToken")
            setBody("""{"name":"Hijacked Campaign"}""")
        }
        assertEquals(HttpStatusCode.Forbidden, updateRes.status)
    }
}

/**
 * Inject an environment variable into the running JVM process via reflection.
 * This must be called before the lazy DatabaseFactory initialises its MongoClient.
 */
@Suppress("UNCHECKED_CAST")
private fun injectEnvVar(key: String, value: String) {
    val env = System.getenv()
    val envClass = env.javaClass
    // On most JDKs the unmodifiable map wraps a field named "m"
    val field = try {
        envClass.getDeclaredField("m")
    } catch (_: NoSuchFieldException) {
        envClass.superclass.getDeclaredField("m")
    }
    field.isAccessible = true
    (field.get(env) as MutableMap<String, String>)[key] = value
}
