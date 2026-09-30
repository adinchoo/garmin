window.onload = async () => {

    const {
        data: { user }
    } = await supabaseClient.auth.getUser();

    if (!user) {
        location.href = "index.html";
        return;
    }

    await loadProfile(user.id);
    await loadHealth(user.id);
    await loadActivities(user.id);
};

async function logout() {

    await supabaseClient.auth.signOut();

    location.href = "index.html";
}

async function loadProfile(userId) {

    const { data } =
        await supabaseClient
            .from("profiles")
            .select("*")
            .eq("user_id", userId)
            .single();

    if (!data) return;

    document.getElementById("weight").innerText =
        data.current_weight_kg + " kg";

    document.getElementById("targetWeight").innerText =
        data.target_weight_kg + " kg";
}

async function loadHealth(userId) {

    const { data } =
        await supabaseClient
            .from("daily_health")
            .select("*")
            .eq("user_id", userId)
            .order("health_date", {
                ascending: false
            })
            .limit(1);

    if (!data?.length) return;

    const h = data[0];

    document.getElementById("steps").innerText =
        h.steps ?? 0;

    document.getElementById("rhr").innerText =
        h.resting_heart_rate ?? "-";

    document.getElementById("stress").innerText =
        h.stress_average ?? "-";

    document.getElementById("readiness").innerText =
        calculateReadiness(h) + "%";
}

function calculateReadiness(h) {

    let score = 50;

    if (h.steps > 5000)
        score += 15;

    if (h.steps > 10000)
        score += 10;

    if ((h.resting_heart_rate ?? 999) < 65)
        score += 15;

    if ((h.stress_average ?? 100) < 40)
        score += 10;

    return Math.min(score, 100);
}

async function loadActivities(userId) {

    const { data } =
        await supabaseClient
            .from("activities")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", {
                ascending: false
            })
            .limit(10);

    const tbody =
        document.getElementById(
            "activitiesTable"
        );

    tbody.innerHTML = "";

    data?.forEach(a => {

        tbody.innerHTML += `
            <tr>
                <td>${a.activity_name || ""}</td>
                <td>${a.activity_type || ""}</td>
                <td>${a.distance_m || 0}</td>
                <td>${a.calories || 0}</td>
            </tr>
        `;
    });
}