const config = window.COOKBOOK_CONFIG || {};
const API_URL = String(config.adminApiUrl || "").replace(/\/$/, "");
const SESSION_KEY = "mcintyreRecipeBook.adminSession";
const RECIPES_PATH = config.recipesPath || "data/recipes.json";
let recipes = [];
let sessionToken = sessionStorage.getItem(SESSION_KEY) || "";

const loginPanel = document.querySelector("#login-panel");
const dashboard = document.querySelector("#dashboard");
const loginForm = document.querySelector("#login-form");
const loginMessage = document.querySelector("#login-message");
const adminMessage = document.querySelector("#admin-message");
const setupWarning = document.querySelector("#setup-warning");
const logoutButton = document.querySelector("#logout-button");
const recipeList = document.querySelector("#admin-recipe-list");
const recipeTotal = document.querySelector("#recipe-total");
const recipeEditor = document.querySelector("#recipe-editor");
const recipeForm = document.querySelector("#admin-recipe-form");
const editorTitle = document.querySelector("#editor-title");
const editorModeLabel = document.querySelector("#editor-mode-label");
const imageInput = document.querySelector("#recipe-image");
const imagePathInput = document.querySelector("#recipe-image-path");
const imagePreview = document.querySelector("#admin-image-preview");

initialize();

async function initialize() {
  bindEvents();
  if (!API_URL) {
    setupWarning.hidden = false;
    loginForm.querySelector("button").disabled = true;
    return;
  }
  if (sessionToken) {
    try {
      await loadRecipes();
      showDashboard();
    } catch {
      signOut(false);
    }
  }
}

function bindEvents() {
  loginForm.addEventListener("submit", login);
  logoutButton.addEventListener("click", () => signOut(true));
  document.querySelector("#new-recipe-button").addEventListener("click", () => openEditor());
  document.querySelector("#reload-button").addEventListener("click", loadRecipes);
  document.querySelector("#cancel-editor-button").addEventListener("click", closeEditor);
  recipeForm.addEventListener("submit", saveRecipe);
  recipeList.addEventListener("click", handleRecipeListClick);
  imageInput.addEventListener("change", previewSelectedImage);
  imagePathInput.addEventListener("input", () => {
    if (!imageInput.files[0]) showPreview(imagePathInput.value.trim());
  });
}

async function login(event) {
  event.preventDefault();
  setStatus(loginMessage, "Signing in...");
  try {
    const response = await fetch(API_URL + "/login", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        username: document.querySelector("#admin-username").value.trim(),
        password: document.querySelector("#admin-password").value
      })
    });
    const data = await readJson(response);
    if (!response.ok) throw new Error(data.error || "Sign in failed.");
    sessionToken = data.token;
    sessionStorage.setItem(SESSION_KEY, sessionToken);
    document.querySelector("#admin-password").value = "";
    await loadRecipes();
    showDashboard();
    setStatus(loginMessage, "");
  } catch (error) {
    setStatus(loginMessage, error.message, true);
  }
}

function showDashboard() {
  loginPanel.hidden = true;
  dashboard.hidden = false;
  logoutButton.hidden = false;
}

function signOut(showMessage) {
  sessionToken = "";
  sessionStorage.removeItem(SESSION_KEY);
  dashboard.hidden = true;
  logoutButton.hidden = true;
  loginPanel.hidden = false;
  closeEditor();
  if (showMessage) setStatus(loginMessage, "Signed out.");
}

async function loadRecipes() {
  setStatus(adminMessage, "Loading latest recipes...");
  const response = await fetch(RECIPES_PATH + "?v=" + Date.now(), {cache:"no-store"});
  if (!response.ok) throw new Error("Could not load " + RECIPES_PATH + ".");
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error("Recipe data is not a valid list.");
  recipes = data.map(normalizeRecipe);
  renderRecipeList();
  setStatus(adminMessage, "");
}

function renderRecipeList() {
  recipeTotal.textContent = recipes.length + " recipe" + (recipes.length === 1 ? "" : "s");
  recipeList.innerHTML = recipes.map(recipe => `
    <article class="admin-recipe-row">
      <div>
        <h3>${escapeHtml(recipe.title)}</h3>
        <p>${escapeHtml(recipe.category || "Family Favorite")} · ${escapeHtml(recipe.source || "Family recipe")}</p>
      </div>
      <div class="admin-actions">
        <button class="secondary-button" type="button" data-edit="${escapeAttr(recipe.id)}">Edit</button>
        <button class="text-button" type="button" data-delete="${escapeAttr(recipe.id)}">Delete</button>
      </div>
    </article>
  `).join("");
}

function handleRecipeListClick(event) {
  const edit = event.target.closest("[data-edit]");
  const del = event.target.closest("[data-delete]");
  if (edit) {
    const recipe = recipes.find(r => r.id === edit.dataset.edit);
    if (recipe) openEditor(recipe);
  }
  if (del) deleteRecipe(del.dataset.delete);
}

function openEditor(recipe = null) {
  recipeForm.reset();
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
  editorTitle.textContent = recipe ? "Edit Recipe" : "Add a New Recipe";
  editorModeLabel.textContent = recipe ? "Edit recipe" : "Add recipe";
  showPreview(recipe?.image || "");
  recipeEditor.hidden = false;
  recipeEditor.scrollIntoView({behavior:"smooth", block:"start"});
}

function closeEditor() {
  recipeEditor.hidden = true;
  recipeForm.reset();
  imagePreview.hidden = true;
  imagePreview.removeAttribute("src");
}

async function saveRecipe(event) {
  event.preventDefault();
  const button = document.querySelector("#save-publish-button");
  button.disabled = true;
  setStatus(adminMessage, "Publishing recipe...");
  try {
    const id = document.querySelector("#recipe-id").value || generateId();
    const oldRecipe = recipes.find(r => r.id === id);
    let imagePath = imagePathInput.value.trim() || oldRecipe?.image || "";

    const file = imageInput.files[0];
    if (file) imagePath = await uploadImage(file, imagePath);

    const now = new Date().toISOString();
    const recipe = normalizeRecipe({
      id,
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
      createdAt: oldRecipe?.createdAt || now,
      updatedAt: now
    });

    if (!recipe.title || !recipe.ingredients.length || !recipe.instructions.length) {
      throw new Error("Recipe name, at least one ingredient, and at least one instruction are required.");
    }

    recipes = oldRecipe ? recipes.map(r => r.id === id ? recipe : r) : [recipe, ...recipes];
    await publishRecipes(oldRecipe ? "Updated recipe: " + recipe.title : "Added recipe: " + recipe.title);
    renderRecipeList();
    closeEditor();
    setStatus(adminMessage, '"' + recipe.title + '" was published successfully.');
  } catch (error) {
    if (error.message === "Unauthorized") signOut(false);
    setStatus(adminMessage, error.message, true);
  } finally {
    button.disabled = false;
  }
}

async function deleteRecipe(id) {
  const recipe = recipes.find(r => r.id === id);
  if (!recipe || !confirm('Delete "' + recipe.title + '" from the cookbook?')) return;
  const before = recipes;
  recipes = recipes.filter(r => r.id !== id);
  setStatus(adminMessage, "Deleting recipe...");
  try {
    await publishRecipes("Deleted recipe: " + recipe.title);
    renderRecipeList();
    setStatus(adminMessage, '"' + recipe.title + '" was deleted and published.');
  } catch (error) {
    recipes = before;
    if (error.message === "Unauthorized") signOut(false);
    setStatus(adminMessage, error.message, true);
  }
}

async function publishRecipes(message) {
  const response = await apiFetch("/recipes", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({recipes, message})
  });
  const data = await readJson(response);
  if (response.status === 401) throw new Error("Unauthorized");
  if (!response.ok) throw new Error(data.error || "Recipe publishing failed.");
}

async function uploadImage(file, requestedPath) {
  if (!file.type.startsWith("image/")) throw new Error("Please choose a valid image file.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Recipe images must be 8 MB or smaller.");
  const base64 = await fileToBase64(file);
  const name = sanitizeFileName(file.name);
  let path = requestedPath || "images/" + name;
  if (!path.startsWith("images/")) path = "images/" + name;

  const response = await apiFetch("/image", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({path, content:base64, message:"Upload recipe image: " + path})
  });
  const data = await readJson(response);
  if (response.status === 401) throw new Error("Unauthorized");
  if (!response.ok) throw new Error(data.error || "Image upload failed.");
  return data.path || path;
}

function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", "Bearer " + sessionToken);
  return fetch(API_URL + path, {...options, headers});
}

function previewSelectedImage() {
  const file = imageInput.files[0];
  if (!file) return showPreview(imagePathInput.value.trim());
  const reader = new FileReader();
  reader.onload = () => showPreview(reader.result);
  reader.readAsDataURL(file);
}

function showPreview(src) {
  if (!src) {
    imagePreview.hidden = true;
    imagePreview.removeAttribute("src");
    return;
  }
  imagePreview.src = src;
  imagePreview.hidden = false;
}

function normalizeRecipe(recipe) {
  return {
    id:String(recipe.id || generateId()),
    title:String(recipe.title || ""),
    category:String(recipe.category || "Family Favorite"),
    prepTime:String(recipe.prepTime || "—"),
    cookTime:String(recipe.cookTime || "—"),
    servings:String(recipe.servings || "—"),
    source:String(recipe.source || ""),
    image:String(recipe.image || ""),
    ingredients:Array.isArray(recipe.ingredients) ? recipe.ingredients.map(String) : [],
    instructions:Array.isArray(recipe.instructions) ? recipe.instructions.map(String) : [],
    notes:String(recipe.notes || ""),
    createdAt:recipe.createdAt || "",
    updatedAt:recipe.updatedAt || ""
  };
}

function splitLines(value) { return String(value || "").split("\n").map(x => x.trim()).filter(Boolean); }
function generateId() { return crypto.randomUUID ? crypto.randomUUID() : "recipe-" + Date.now() + "-" + Math.random().toString(16).slice(2); }
function sanitizeFileName(name) {
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0,dot) : name).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || "recipe-image";
  const ext = (dot > 0 ? name.slice(dot+1) : "png").toLowerCase().replace(/[^a-z0-9]/g,"") || "png";
  return base + "." + ext;
}
function fileToBase64(file) {
  return new Promise((resolve,reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
async function readJson(response) { try { return await response.json(); } catch { return {}; } }
function setStatus(element, message, error=false) {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("error", error);
}
function escapeHtml(value) { return String(value || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"); }
function escapeAttr(value) { return escapeHtml(value).replace(/`/g,"&#096;"); }
