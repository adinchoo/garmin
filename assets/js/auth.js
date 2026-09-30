async function signUp() {
  const fullName = document.getElementById("fullName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;

  if (!fullName || !email || !password) {
    alert("Please fill in all signup fields.");
    return;
  }

  const { error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      }
    }
  });

  if (error) {
    alert(error.message);
    return;
  }

  alert("Account created. Please verify your email if email confirmation is enabled.");
}

async function login() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) {
    alert("Please enter email and password.");
    return;
  }

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert(error.message);
    return;
  }

  window.location.href = "./dashboard.html";
}

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "./index.html";
}