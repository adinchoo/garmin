async function signUp() {

    const fullName =
        document.getElementById("fullName").value;

    const email =
        document.getElementById("signupEmail").value;

    const password =
        document.getElementById("signupPassword").value;

    const { data, error } =
        await supabaseClient.auth.signUp({
            email,
            password
        });

    if (error) {
        alert(error.message);
        return;
    }

    if (data.user) {

        const { error: profileError } =
            await supabaseClient
                .from("profiles")
                .insert({
                    user_id: data.user.id,
                    full_name: fullName,
                    date_of_birth: "1997-10-05",
                    height_cm: 174,
                    current_weight_kg: 83,
                    target_weight_kg: 75,
                    timezone: "Asia/Kuala_Lumpur",
                    primary_goal: "weight_loss"
                });

        if (profileError) {
            console.error(profileError);
        }
    }

    alert("Account created. Verify your email.");
}

async function login() {

    const email =
        document.getElementById("loginEmail").value;

    const password =
        document.getElementById("loginPassword").value;

    const { error } =
        await supabaseClient
            .auth
            .signInWithPassword({
                email,
                password
            });

    if (error) {
        alert(error.message);
        return;
    }

    window.location.href =
        "dashboard.html";
}

async function logout() {

    await supabaseClient.auth.signOut();

    window.location.href =
        "index.html";
}