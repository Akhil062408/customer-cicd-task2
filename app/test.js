const http = require("http");

const port = Number(process.env.TEST_PORT || 8080);

const request = http.get(
    {
        host: "127.0.0.1",
        port: port,
        path: "/health"
    },
    response => {

        let body = "";

        response.on("data", chunk => {
            body += chunk;
        });

        response.on("end", () => {

            console.log(`HTTP STATUS: ${response.statusCode}`);
            console.log(body);

            if (response.statusCode !== 200) {
                console.error("TEST FAILED");
                process.exit(1);
            }

            console.log("TEST PASSED");
            process.exit(0);
        });
    }
);

request.on("error", error => {

    console.error("TEST FAILED");
    console.error(error.message);

    process.exit(1);
});