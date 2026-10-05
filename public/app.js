const STORAGE_KEY = "healthtwin_records";

let records = JSON.parse(
    localStorage.getItem(STORAGE_KEY) || "null"
);

if (!records) {
    records = [
        {
            systolic: 132,
            diastolic: 84,
            heartRate: 74,
            sleep: 7,
            source: "Historical health record",
            timestamp: "2026-09-28T08:30:00"
        },
        {
            systolic: 136,
            diastolic: 86,
            heartRate: 78,
            sleep: 6.5,
            source: "Historical health record",
            timestamp: "2026-09-29T08:30:00"
        },
        {
            systolic: 129,
            diastolic: 82,
            heartRate: 72,
            sleep: 8,
            source: "Historical health record",
            timestamp: "2026-09-30T08:30:00"
        },
        {
            systolic: 141,
            diastolic: 90,
            heartRate: 81,
            sleep: 6,
            source: "Historical health record",
            timestamp: "2026-10-01T08:30:00"
        }
    ];

    saveRecords();
}

function saveRecords() {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(records)
    );
}

function latestRecord() {
    return records[records.length - 1];
}

function renderTwin() {
    const latest = latestRecord();

    if (!latest) return;

    document.getElementById("bpValue").textContent =
        `${latest.systolic}/${latest.diastolic}`;

    document.getElementById("hrValue").textContent =
        latest.heartRate;

    document.getElementById("sleepValue").textContent =
        latest.sleep;

    document.getElementById("twinStatus").textContent =
        "ACTIVE";

    document.getElementById("modelState").textContent =
        "Updated";

    renderTimeline();
}

function renderTimeline() {
    const timeline =
        document.getElementById("timeline");

    timeline.innerHTML = "";

    [...records]
        .reverse()
        .forEach(record => {
            const item =
                document.createElement("div");

            item.className =
                "timeline-item";

            const date =
                new Date(record.timestamp);

            item.innerHTML = `
                <strong>
                    ${date.toLocaleString()}
                </strong>

                <p>
                    BP: ${record.systolic}/${record.diastolic}
                    mmHg |
                    HR: ${record.heartRate} BPM |
                    Sleep: ${record.sleep} hours
                </p>

                <p>
                    Source: ${record.source}
                </p>
            `;

            timeline.appendChild(item);
        });
}

function updateTwin() {
    const systolic =
        Number(
            document.getElementById("systolic").value
        );

    const diastolic =
        Number(
            document.getElementById("diastolic").value
        );

    const heartRate =
        Number(
            document.getElementById("hr").value
        );

    const sleep =
        Number(
            document.getElementById("sleepInput").value
        );

    if (
        !systolic ||
        !diastolic ||
        !heartRate ||
        !sleep
    ) {
        showMessage(
            "Please enter all measurement values."
        );
        return;
    }

    const record = {
        systolic,
        diastolic,
        heartRate,
        sleep,
        source:
            "Manual health measurement",
        timestamp:
            new Date().toISOString()
    };

    records.push(record);
    saveRecords();
    renderTwin();

    document.getElementById("systolic").value = "";
    document.getElementById("diastolic").value = "";
    document.getElementById("hr").value = "";
    document.getElementById("sleepInput").value = "";

    showMessage(
        "Digital Twin updated successfully."
    );
}

function simulateWearable() {
    const latest =
        latestRecord();

    if (!latest) return;

    const simulatedHeartRate =
        Math.round(
            latest.heartRate +
            (Math.random() * 10 - 5)
        );

    const record = {
        systolic:
            latest.systolic,
        diastolic:
            latest.diastolic,
        heartRate:
            simulatedHeartRate,
        sleep:
            latest.sleep,
        source:
            "Simulated wearable stream",
        timestamp:
            new Date().toISOString()
    };

    records.push(record);
    saveRecords();
    renderTwin();

    showMessage(
        "Simulated wearable reading added."
    );
}

function updateScenario() {
    const activity =
        Number(
            document.getElementById("activity").value
        );

    const sleep =
        Number(
            document.getElementById("scenarioSleep").value
        );

    document.getElementById(
        "activityValue"
    ).textContent = activity;

    document.getElementById(
        "scenarioSleepValue"
    ).textContent = sleep;

    const score =
        Math.round(
            Math.max(
                0,
                Math.min(
                    100,
                    50 -
                    (activity - 30) * 0.15 -
                    (sleep - 7) * 2
                )
            )
        );

    document.getElementById(
        "scenarioScore"
    ).textContent = score;
}

async function searchResources() {
    const topic =
        document.getElementById(
            "searchTopic"
        ).value.trim();

    const container =
        document.getElementById(
            "resources"
        );

    if (!topic) {
        container.innerHTML =
            "<p>Please enter a health topic.</p>";
        return;
    }

    container.innerHTML =
        "<p>Searching resources...</p>";

    try {
        const response =
            await fetch(
                `/api/resources?condition=${encodeURIComponent(topic)}`
            );

        const data =
            await response.json();

        if (!response.ok) {
            throw new Error(
                data.error ||
                "Search failed."
            );
        }

        container.innerHTML = "";

        if (
            !data.results ||
            data.results.length === 0
        ) {
            container.innerHTML =
                "<p>No resources found.</p>";
            return;
        }

        data.results.forEach(result => {
            const card =
                document.createElement("div");

            card.className =
                "resource-card";

            const title =
                document.createElement("h3");

            title.textContent =
                result.title || "Health Resource";

            const snippet =
                document.createElement("p");

            snippet.textContent =
                result.snippet || "";

            const link =
                document.createElement("a");

            link.href =
                result.link || "#";

            link.target =
                "_blank";

            link.rel =
                "noopener noreferrer";

            link.textContent =
                "Open Resource →";

            card.appendChild(title);
            card.appendChild(snippet);
            card.appendChild(link);

            container.appendChild(card);
        });

    } catch (error) {
        container.innerHTML =
            `<p>${error.message}</p>`;
    }
}

function exportData() {
    const data = {
        application:
            "HealthTwin AI",
        patientId:
            "HT-001",
        dataType:
            "Synthetic demonstration data",
        records:
            records
    };

    const blob =
        new Blob(
            [JSON.stringify(data, null, 2)],
            {
                type: "application/json"
            }
        );

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;

    link.download =
        "healthtwin-demo-data.json";

    link.click();

    URL.revokeObjectURL(url);
}

function showMessage(message) {
    const element =
        document.getElementById(
            "message"
        );

    element.textContent =
        message;

    setTimeout(() => {
        element.textContent = "";
    }, 3000);
}

renderTwin();
updateScenario();
