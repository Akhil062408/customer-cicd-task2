const http = require("http");

const port = Number(process.env.TEST_PORT || 8080);

function request(path) {
    return new Promise((resolve, reject) => {
        http.get(
            {
                host: "127.0.0.1",
                port: port,
                path: path
            },
            response => {
                let body = "";

                response.on("data", chunk => {
                    body += chunk;
                });

                response.on("end", () => {
                    resolve({
                        statusCode: response.statusCode,
                        body: body
                    });
                });
            }
        ).on("error", reject);
    });
}

async function runTests() {
    try {
        const health = await request("/health");

        console.log(`HEALTH STATUS: ${health.statusCode}`);

        if (health.statusCode !== 200) {
            throw new Error("Health check failed");
        }

        const search = await request("/customers/search?q=John");

        console.log(`SEARCH STATUS: ${search.statusCode}`);
        console.log(search.body);

        if (search.statusCode !== 200) {
            throw new Error("Customer search test failed");
        }

        console.log("ALL TESTS PASSED");
    } catch (error) {
        console.error("TEST FAILED");
        console.error(error.message);
        process.exit(1);
    }
}

runTests();