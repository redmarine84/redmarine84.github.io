const cookbookConfig = window.COOKBOOK_CONFIG || {};
const secrets = window.COOKBOOK_ADMIN_SECRETS || {};

const OWNER = cookbookConfig.githubOwner || "redmarine84";
const REPO = cookbookConfig.githubRepo || "redmarine84.github.io";
const BRANCH = cookbookConfig.githubBranch || "master";
const IMAGE_FOLDER = normalizeFolder(cookbookConfig.imageFolder || "images");
const RECIPES_PATH = normalizePath(cookbookConfig.recipesPath || "data/recipes.json");

let githubToken = "";
let recipes = [];
let editingRecipeId = "";

const loginPanel = document.querySelector("#login-panel");
const dashboard = document.querySelector("#dashboard");
const setupWarning = document.querySelector("#setup-warning");
const loginForm = document.querySelector("#login-form");
const loginMessage = document.querySelector("#login-message");
const adminMessage = document.querySelector("#admin-message");
const recipeList = document.querySelector("#recipe-list");
const recipeTotal = document.querySelector("#recipe-total");
const recipeEditor = document.querySelector("#recipe-editor");
const recipeForm = document.querySelector("#recipe-form");
const imageInput = document.querySelector("#recipe-image");
const imagePathInput = document.querySelector("#recipe-image-path");
const imagePreviewWrap = document.querySelector("#image-preview-wrap");
const imagePreview = document.querySelector("#image-preview");

initialize();

function initialize() {
  bindEvents();

  if (!isSetupComplete()) {
    setupWarning.hidden = false;
    document.querySelector("#login-button").disabled = true;
  }
}

function bindEvents() {
  loginForm.addEventListener("submit", handleLogin);
  document.querySelector("#logout-button").addEventListener("click", logout);
  document.querySelector("#new-recipe-button").addEventListener("click", () => openEditor());
  document.querySelector("#reload-button").addEventListener("click", loadRecipesFromGitHub);
  document.querySelector("#close-editor-button").addEventListener("click", closeEditor);
  document.querySelector("#cancel-button").addEventListener("click", closeEditor);
  recipeForm.addEventListener("submit", handleSaveRecipe);
  recipeList.addEventListener("click", handleRecipeListClick);
  imageInput.addEventListener("change", previewSelectedImage);
  imagePathInput.addEventListener("input", () => {
    if (!imageInput.files[0]) {
      showImagePreview(imagePathInput.value.trim());
    }
  });
}

function isSetupComplete() {
  return Boolean(
    secrets.username &&
    secrets.salt &&
    secrets.iv &&
    secrets.ciphertext &&
    secrets.iterations
  );
}

async function handleLogin(event) {
  event.preventDefault();
  setMessage(loginMessage, "Signing in...");

  const username = document.querySelector("#admin-username").value.trim();
  const password = document.querySelector("#admin-password").value;

  try {
    if (!safeStringEqual(username, secrets.username)) {
      throw new Error("Incorrect family username or password.");
    }

    githubToken = await decryptGithubToken(password);

    if (!githubToken || !githubToken.startsWith("github_")) {
      githubToken = "";
      throw new Error("Incorrect family username or password.");
    }

    await testGitHubToken();
    document.querySelector("#admin-password").value = "";
    loginPanel.hidden = true;
    dashboard.hidden = false;
    await loadRecipesFromGitHub();
    setMessage(loginMessage, "");
  } catch (error) {
    githubToken = "";
    console.error(error);
    setMessage(loginMessage, "Incorrect family username or password.", true);
  }
}

async function decryptGithubToken(password) {
  try {
    const salt = base64ToBytes(secrets.salt);
    const iv = base64ToBytes(secrets.iv);
    const encrypted = base64ToBytes(secrets.ciphertext);

    const baseKey = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: Number(secrets.iterations),
        hash: "SHA-256"
      },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  } catch {
    throw new Error("Incorrect family username or password.");
  }
}

async function testGitHubToken() {
  const response = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(OWNER)}/${encodeURIComponent(REPO)}`,
    { headers: githubHeaders() }
  );

  if (!response.ok) {
    throw new Error("The stored GitHub token no longer has access to the cookbook repository.");
  }
}

function logout() {
  githubToken = "";
  recipes = [];
  editingRecipeId = "";
  dashboard.hidden = true;
  loginPanel.hidden = false;
  closeEditor();
  loginForm.reset();
  setMessage(loginMessage, "Signed out.");
}

async function loadRecipesFromGitHub() {
  if (!githubToken) return;

  setMessage(adminMessage, "Loading the latest cookbook from GitHub...");

  try {
    const file = await getGithubFile(RECIPES_PATH);
    if (!file || !file.content) throw new Error(`Could not load ${RECIPES_PATH}.`);

    const jsonText = base64ToUtf8(file.content);
    const parsed = JSON.parse(jsonText);

    if (!Array.isArray(parsed)) {
      throw new Error(`${RECIPES_PATH} does not contain a recipe list.`);
    }

    recipes = parsed.map(normalizeRecipe);
    renderRecipeList();
    setMessage(adminMessage, "");
  } catch (error) {
    console.error(error);
    setMessage(adminMessage, error.message || "Could not load recipes.", true);
  }
}

function renderRecipeList() {
  recipeTotal.textContent = `${recipes.length} recipe${recipes.length === 1 ? "" : "s"}`;

  const sorted = [...recipes].sort((a, b) =>
    String(a.title).localeCompare(String(b.title))
  );

  recipeList.innerHTML = sorted.map(recipe => `
    <article class="admin-recipe-row">
      <div>
        <h3>${escapeHtml(recipe.title)}</h3>
        <p>${escapeHtml(recipe.category || "Family Favorite")}${recipe.source ? ` · ${escapeHtml(recipe.source)}` : ""}</p>
      </div>

      <div class="admin-actions">
        <button class="secondary-button" type="button" data-edit-id="${escapeAttr(recipe.id)}">Edit</button>
        <button class="admin-delete-button" type="button" data-delete-id="${escapeAttr(recipe.id)}">Delete</button>
      </div>
    </article>
  `).join("");
}

function handleRecipeListClick(event) {
  const editButton = event.target.closest("[data-edit-id]");
  const deleteButton = event.target.closest("[data-delete-id]");

  if (editButton) {
    const recipe = recipes.find(item => item.id === editButton.dataset.editId);
    if (recipe) openEditor(recipe);
  }

  if (deleteButton) {
    deleteRecipe(deleteButton.dataset.deleteId);
  }
}

function openEditor(recipe = null) {
  recipeForm.reset();
  editingRecipeId = recipe?.id || "";

  document.querySelector("#recipe-id").value = recipe?.id || "";
  document.querySelector("#recipe-title").value = recipe?.title || "";
  document.querySelector("#recipe-category").value = recipe?.category || "";
  document.querySelector("#recipe-prep").value = recipe?.prepTime || "";
  document.querySelector("#recipe-cook").value = recipe?.cookTime || "";
  document.querySelector("#recipe-servings").value = recipe?.servings || "";
  document.querySelector("#recipe-source").value = recipe?.source || "";
  imagePathInput.value = recipe?.image && !recipe.image.startsWith("data:") ? recipe.image : "";
  document.querySelector("#recipe-ingredients").value = (recipe?.ingredients || []).join("\n");
  document.querySelector("#recipe-instructions").value = (recipe?.instructions || []).join("\n");
  document.querySelector("#recipe-notes").value = recipe?.notes || "";

  document.querySelector("#editor-mode-label").textContent = recipe ? "Edit recipe" : "Add recipe";
  document.querySelector("#editor-title").textContent = recipe ? `Edit ${recipe.title}` : "Add a New Recipe";

  showImagePreview(recipe?.image || "");
  recipeEditor.hidden = false;
  recipeEditor.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeEditor() {
  editingRecipeId = "";
  recipeEditor.hidden = true;
  recipeForm.reset();
  imagePreviewWrap.hidden = true;
  imagePreview.removeAttribute("src");
}

async function handleSaveRecipe(event) {
  event.preventDefault();
  const saveButton = document.querySelector("#save-button");
  saveButton.disabled = true;

  try {
    setMessage(adminMessage, "Loading the latest cookbook before publishing...");

    // Always start with the newest repository copy to reduce accidental overwrites.
    const latestFile = await getGithubFile(RECIPES_PATH);
    const latestRecipes = JSON.parse(base64ToUtf8(latestFile.content || "")).map(normalizeRecipe);

    const existingId = document.querySelector("#recipe-id").value || editingRecipeId;
    const existing = existingId
      ? latestRecipes.find(item => item.id === existingId)
      : null;

    let imagePath = imagePathInput.value.trim() || existing?.image || "";
    const imageFile = imageInput.files[0];

    if (imageFile) {
      setMessage(adminMessage, "Uploading recipe image...");
      imagePath = await uploadRecipeImage(imageFile, imagePath);
    }

    const now = new Date().toISOString();
    const recipe = normalizeRecipe({
      id: existing?.id || generateId(),
      title: document.querySelector("#recipe-title").value.trim(),
      category: document.querySelector("#recipe-category").value.trim(),
      prepTime: document.querySelector("#recipe-prep").value.trim(),
      cookTime: document.querySelector("#recipe-cook").value.trim(),
      servings: document.querySelector("#recipe-servings").value.trim(),
      source: document.querySelector("#recipe-source").value.trim(),
      image: imagePath,
      ingredients: splitLines(document.querySelector("#recipe-ingredients").value),
      instructions: splitLines(document.querySelector("#recipe-instructions").value),
      notes: document.querySelector("#recipe-notes").value.trim(),
      createdAt: existing?.createdAt || now,
      updatedAt: now
    });

    if (!recipe.title) throw new Error("Recipe name is required.");
    if (!recipe.ingredients.length) throw new Error("Enter at least one ingredient.");
    if (!recipe.instructions.length) throw new Error("Enter at least one instruction.");

    const nextRecipes = existing
      ? latestRecipes.map(item => item.id === existing.id ? recipe : item)
      : [recipe, ...latestRecipes];

    setMessage(adminMessage, "Publishing recipe to GitHub...");
    await putGithubTextFile(
      RECIPES_PATH,
      JSON.stringify(nextRecipes, null, 2),
      existing ? `Updated recipe: ${recipe.title}` : `Added recipe: ${recipe.title}`,
      latestFile.sha
    );

    recipes = nextRecipes.map(normalizeRecipe);
    renderRecipeList();
    closeEditor();
    setMessage(adminMessage, `"${recipe.title}" was published successfully.`);
  } catch (error) {
    console.error(error);
    setMessage(adminMessage, error.message || "Recipe publishing failed.", true);
  } finally {
    saveButton.disabled = false;
  }
}

async function deleteRecipe(recipeId) {
  const visibleRecipe = recipes.find(item => item.id === recipeId);
  if (!visibleRecipe) return;

  if (!confirm(`Delete "${visibleRecipe.title}" from the cookbook?`)) return;

  try {
    setMessage(adminMessage, "Loading the latest cookbook before deleting...");

    const latestFile = await getGithubFile(RECIPES_PATH);
    const latestRecipes = JSON.parse(base64ToUtf8(latestFile.content || "")).map(normalizeRecipe);
    const recipe = latestRecipes.find(item => item.id === recipeId);

    if (!recipe) {
      recipes = latestRecipes;
      renderRecipeList();
      throw new Error("That recipe was already removed.");
    }

    const nextRecipes = latestRecipes.filter(item => item.id !== recipeId);

    setMessage(adminMessage, "Publishing deletion to GitHub...");
    await putGithubTextFile(
      RECIPES_PATH,
      JSON.stringify(nextRecipes, null, 2),
      `Deleted recipe: ${recipe.title}`,
      latestFile.sha
    );

    recipes = nextRecipes;
    renderRecipeList();

    if (editingRecipeId === recipeId) closeEditor();
    setMessage(adminMessage, `"${recipe.title}" was deleted and published.`);
  } catch (error) {
    console.error(error);
    setMessage(adminMessage, error.message || "Recipe could not be deleted.", true);
  }
}

async function uploadRecipeImage(file, requestedPath = "") {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose a valid image file.");
  }

  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Recipe images must be 8 MB or smaller.");
  }

  let path = normalizePath(requestedPath);
  if (!path || !path.startsWith(`${IMAGE_FOLDER}/`)) {
    path = `${IMAGE_FOLDER}/${sanitizeFileName(file.name)}`;
  }

  const dataUrl = await readFileAsDataUrl(file);
  const base64Content = dataUrl.split(",")[1] || "";

  const existing = await getGithubFile(path, true);

  await putGithubBase64File(
    path,
    base64Content,
    `Upload recipe image: ${path}`,
    existing?.sha || ""
  );

  return path;
}

async function getGithubFile(path, allowMissing = false) {
  const response = await fetch(
    `${githubContentUrl(path)}?ref=${encodeURIComponent(BRANCH)}`,
    { headers: githubHeaders() }
  );

  if (allowMissing && response.status === 404) return null;

  if (!response.ok) {
    throw new Error(`Could not read ${path}. ${await readGitHubError(response)}`.trim());
  }

  return response.json();
}

async function putGithubTextFile(path, text, message, sha = "") {
  return putGithubBase64File(path, utf8ToBase64(text), message, sha);
}

async function putGithubBase64File(path, base64Content, message, sha = "") {
  const body = {
    message,
    content: base64Content,
    branch: BRANCH
  };

  if (sha) body.sha = sha;

  const response = await fetch(githubContentUrl(path), {
    method: "PUT",
    headers: {
      ...githubHeaders(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`GitHub publish failed for ${path}. ${await readGitHubError(response)}`.trim());
  }

  return response.json();
}

function githubContentUrl(path) {
  return `https://api.github.com/repos/${encodeURIComponent(OWNER)}/${encodeURIComponent(REPO)}/contents/${encodeRepoPath(path)}`;
}

function githubHeaders() {
  if (!githubToken) throw new Error("Admin session is not signed in.");

  return {
    "Authorization": `Bearer ${githubToken}`,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

async function readGitHubError(response) {
  try {
    const error = await response.json();
    return error.message ? `GitHub says: ${error.message}` : `${response.status} ${response.statusText}`;
  } catch {
    return `${response.status} ${response.statusText}`;
  }
}

function previewSelectedImage() {
  const file = imageInput.files[0];

  if (!file) {
    showImagePreview(imagePathInput.value.trim());
    return;
  }

  const reader = new FileReader();
  reader.onload = () => showImagePreview(reader.result);
  reader.readAsDataURL(file);
}

function showImagePreview(src) {
  if (!src) {
    imagePreviewWrap.hidden = true;
    imagePreview.removeAttribute("src");
    return;
  }

  imagePreview.src = src;
  imagePreviewWrap.hidden = false;
}

function normalizeRecipe(recipe) {
  return {
    id: String(recipe.id || generateId()),
    title: String(recipe.title || "Untitled Recipe"),
    category: String(recipe.category || "Family Favorite"),
    prepTime: String(recipe.prepTime || "—"),
    cookTime: String(recipe.cookTime || "—"),
    servings: String(recipe.servings || "—"),
    source: String(recipe.source || ""),
    image: String(recipe.image || ""),
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients.map(String) : splitLines(recipe.ingredients),
    instructions: Array.isArray(recipe.instructions) ? recipe.instructions.map(String) : splitLines(recipe.instructions),
    notes: String(recipe.notes || ""),
    createdAt: recipe.createdAt || "",
    updatedAt: recipe.updatedAt || ""
  };
}

function splitLines(value) {
  return String(value || "")
    .split("\n")
    .map(item => item.trim())
    .filter(Boolean);
}

function generateId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `recipe-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sanitizeFileName(fileName) {
  const original = String(fileName || "recipe-image.png").trim();
  const dot = original.lastIndexOf(".");
  const base = dot > 0 ? original.slice(0, dot) : original;
  const ext = dot > 0 ? original.slice(dot + 1) : "png";

  const safeBase = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "recipe-image";

  const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  return `${safeBase}.${safeExt}`;
}

function normalizeFolder(value) {
  return normalizePath(value).replace(/\/$/, "");
}

function normalizePath(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/")
    .trim();
}

function encodeRepoPath(path) {
  return normalizePath(path).split("/").map(encodeURIComponent).join("/");
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function utf8ToBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  const chunk = 0x8000;

  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }

  return btoa(binary);
}

function base64ToUtf8(value) {
  const cleaned = String(value || "").replace(/\s/g, "");
  const binary = atob(cleaned);
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function base64ToBytes(value) {
  const binary = atob(String(value || ""));
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function safeStringEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;

  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

function setMessage(element, message, isError = false) {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("error", isError);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}
