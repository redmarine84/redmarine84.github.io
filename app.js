const STORAGE_KEY = "mcintyreRecipeBook.recipes";
const GITHUB_SETTINGS_KEY = "mcintyreRecipeBook.githubSettings";

const defaultGithubSettings = {
  owner: "",
  repo: "",
  branch: "main",
  imageFolder: "images",
  recipesPath: "data/recipes.json",
  token: ""
};

const placeholderImage =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="675" viewBox="0 0 900 675">
      <rect width="900" height="675" fill="#fff8ed"/>
      <circle cx="450" cy="300" r="130" fill="#eadcc9"/>
      <path d="M285 472h330" stroke="#8a3d24" stroke-width="22" stroke-linecap="round"/>
      <path d="M350 340c40 58 160 58 200 0" fill="none" stroke="#8a3d24" stroke-width="24" stroke-linecap="round"/>
      <text x="450" y="560" text-anchor="middle" font-size="52" font-family="Georgia" fill="#5d2818">Family Recipe</text>
    </svg>
  `);

const seedRecipes = [
  {
    id: "beef-stew",
    title: "Beef Stew",
    category: "Dinner",
    prepTime: "10 minutes",
    cookTime: "150 minutes",
    servings: "6",
    source: "Original starter recipe",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Cooked_mechado.JPG/640px-Cooked_mechado.JPG",
    ingredients: [
      "3 Tbsp olive oil",
      "1 Tbsp butter",
      "2 pounds stew meat",
      "1 medium onion, diced",
      "3 garlic cloves, minced",
      "1 can beer, 12 oz",
      "4 cups beef stock",
      "2 cups water",
      "1 Tbsp Worcestershire sauce",
      "Tomato paste",
      "1/2 tsp paprika",
      "1/2 tsp kosher salt",
      "Freshly ground black pepper",
      "1 1/2 tsp sugar",
      "4 carrots, roughly sliced",
      "4 new potatoes, quartered",
      "Minced parsley, optional"
    ],
    instructions: [
      "Heat oil and butter in a large pot over medium-high heat. Brown meat in two batches, then set aside.",
      "Add diced onions to the pot and cook for 2 to 3 minutes. Add garlic and cook for another minute.",
      "Pour in beer and beef stock. Add Worcestershire sauce, tomato paste, paprika, salt, pepper, and sugar. Return beef to the pot, cover, and simmer for 1 1/2 to 2 hours.",
      "Add carrots and potatoes. Cover and cook for 30 more minutes. Add hot water as needed if the stew gets too thick.",
      "Taste and adjust seasoning. Serve with crusty bread and minced parsley if desired."
    ],
    notes: "Recipe can be doubled or tripled if needed."
  },
  {
    id: "pin-wheels",
    title: "Pin Wheels",
    category: "Appetizer",
    prepTime: "15 minutes",
    cookTime: "Chill 30 minutes",
    servings: "6",
    source: "Family favorite",
    image: "https://images.unsplash.com/photo-1625944525533-473f1a3d54e7?auto=format&fit=crop&w=900&q=80",
    ingredients: [
      "2 packages cream cheese, 8 oz each, softened",
      "1 package ranch salad dressing mix, 1 oz",
      "3 green onions, chopped",
      "1/2 green bell pepper, chopped",
      "11 flour tortillas, 8 inch",
      "22 slices thinly sliced ham"
    ],
    instructions: [
      "Beat cream cheese and ranch dressing mix in a small bowl. Stir in green onions and bell pepper.",
      "Spread cream cheese mixture over each tortilla and top each tortilla with two slices of ham.",
      "Roll tortillas tightly and wrap in plastic wrap. Refrigerate until firm, about 30 minutes.",
      "Unwrap and cut into 3/4-inch slices."
    ],
    notes: "Great make-ahead party snack."
  },
  {
    id: "taco-rolls",
    title: "Taco Rolls",
    category: "Dinner",
    prepTime: "15 minutes",
    cookTime: "15 minutes",
    servings: "8",
    source: "Family favorite",
    image: "https://images.unsplash.com/photo-1613514785940-daed07799d9b?auto=format&fit=crop&w=900&q=80",
    ingredients: [
      "1 pound ground beef",
      "1 package taco seasoning",
      "1 cup shredded sharp cheddar cheese",
      "1 tube crescent rolls"
    ],
    instructions: [
      "Preheat oven to 350°F.",
      "Brown ground beef, drain, and return it to the pan.",
      "Add taco seasoning and prepare according to the seasoning package directions.",
      "Place 2 spoonfuls of taco meat on each crescent roll, add cheese, and roll up.",
      "Bake for 15 minutes or until the crescent rolls are golden brown."
    ],
    notes: "Serve with salsa, sour cream, or guacamole."
  }
];

let recipes = [];
let selectedImageFile = null;
let selectedImagePreviewData = "";
let removeCurrentImage = false;
let editingRecipeId = "";
let isSavingRecipe = false;
let isPublishing = false;

const recipesGrid = document.querySelector("#recipes-grid");
const recipeCount = document.querySelector("#recipe-count");
const emptyState = document.querySelector("#empty-state");
const searchInput = document.querySelector("#recipe-search");
const recipeForm = document.querySelector("#recipe-form");
const imageInput = document.querySelector("#recipe-image");
const imagePathInput = document.querySelector("#recipe-image-path");
const imagePreviewWrap = document.querySelector("#image-preview-wrap");
const imagePreview = document.querySelector("#image-preview");
const imagePreviewTitle = document.querySelector("#image-preview-title");
const currentYear = document.querySelector("#current-year");
const editingRecipeIdInput = document.querySelector("#editing-recipe-id");
const formModeLabel = document.querySelector("#form-mode-label");
const formTitle = document.querySelector("#add-recipe-title");
const formHelpText = document.querySelector("#form-help-text");
const editStatus = document.querySelector("#edit-status");
const editStatusTitle = document.querySelector("#edit-status-title");
const saveRecipeButton = document.querySelector("#save-recipe-button");
const cancelEditButton = document.querySelector("#cancel-edit-button");
const removeImageButton = document.querySelector("#remove-image-button");
const saveMessage = document.querySelector("#save-message");

const githubForm = document.querySelector("#github-form");
const githubOwnerInput = document.querySelector("#github-owner");
const githubRepoInput = document.querySelector("#github-repo");
const githubBranchInput = document.querySelector("#github-branch");
const githubImageFolderInput = document.querySelector("#github-image-folder");
const githubRecipesPathInput = document.querySelector("#github-recipes-path");
const githubTokenInput = document.querySelector("#github-token");
const saveGithubSettingsButton = document.querySelector("#save-github-settings-button");
const loadGithubRecipesButton = document.querySelector("#load-github-recipes-button");
const publishRecipesButton = document.querySelector("#publish-recipes-button");
const githubMessage = document.querySelector("#github-message");

initializeApp();

async function initializeApp() {
  currentYear.textContent = new Date().getFullYear();
  loadGithubSettingsIntoForm();
  bindEvents();

  recipes = await loadInitialRecipes();
  renderRecipes();
}

function bindEvents() {
  searchInput.addEventListener("input", renderRecipes);
  saveRecipeButton.addEventListener("click", handleRecipeSave);
  recipeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    handleRecipeSave();
  });

  cancelEditButton.addEventListener("click", resetRecipeForm);
  removeImageButton.addEventListener("click", () => {
    selectedImageFile = null;
    selectedImagePreviewData = "";
    removeCurrentImage = true;
    imageInput.value = "";
    imagePathInput.value = "";
    showImagePreview(placeholderImage, "Placeholder Image");
  });

  imagePathInput.addEventListener("input", () => {
    selectedImageFile = null;
    selectedImagePreviewData = "";
    imageInput.value = "";
    removeCurrentImage = false;

    const path = imagePathInput.value.trim();
    if (path) {
      showImagePreview(path, "Image Path Preview");
    } else if (editingRecipeId) {
      const recipe = recipes.find((item) => item.id === editingRecipeId);
      showImagePreview(recipe?.image || placeholderImage, "Current Image");
    } else {
      hideImagePreview();
    }
  });

  imageInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];

    if (!file) {
      selectedImageFile = null;
      selectedImagePreviewData = "";
      removeCurrentImage = false;

      const imagePath = imagePathInput.value.trim();
      if (imagePath) {
        showImagePreview(imagePath, "Image Path Preview");
      } else if (editingRecipeId) {
        const recipe = recipes.find((item) => item.id === editingRecipeId);
        showImagePreview(recipe?.image || placeholderImage, "Current Image");
      } else {
        hideImagePreview();
      }

      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file.");
      imageInput.value = "";
      return;
    }

    try {
      selectedImageFile = file;
      removeCurrentImage = false;
      selectedImagePreviewData = await readFileAsDataURL(file);

      const settings = getGithubSettingsFromForm();
      imagePathInput.value = `${normalizeFolder(settings.imageFolder || "images")}/${sanitizeFileName(file.name)}`;
      showImagePreview(selectedImagePreviewData, editingRecipeId ? "New Replacement Image" : "Image Preview");
    } catch (error) {
      console.error("Image could not be loaded.", error);
      alert("That image could not be loaded. Please try a different image.");
      imageInput.value = "";
      selectedImageFile = null;
      selectedImagePreviewData = "";
    }
  });

  recipesGrid.addEventListener("click", async (event) => {
    const printButton = event.target.closest("[data-print-id]");
    const editButton = event.target.closest("[data-edit-id]");
    const deleteButton = event.target.closest("[data-delete-id]");

    if (printButton) {
      const recipe = recipes.find((item) => item.id === printButton.dataset.printId);
      if (recipe) printRecipe(recipe);
    }

    if (editButton) {
      startEditingRecipe(editButton.dataset.editId);
    }

    if (deleteButton) {
      const recipe = recipes.find((item) => item.id === deleteButton.dataset.deleteId);
      if (!recipe) return;

      const confirmed = confirm(`Delete "${recipe.title}" from this cookbook?`);
      if (!confirmed) return;

      recipes = recipes.filter((item) => item.id !== recipe.id);
      saveLocalBackup();

      if (editingRecipeId === recipe.id) {
        resetRecipeForm();
      }

      renderRecipes();
      await autoPublishRecipes(`Deleted recipe: ${recipe.title}`);
    }
  });

  saveGithubSettingsButton.addEventListener("click", () => {
    saveGithubSettingsFromForm();
    showGithubMessage("GitHub settings saved on this browser.");
  });

  loadGithubRecipesButton.addEventListener("click", async () => {
    clearGithubMessage();
    try {
      const loadedRecipes = await fetchRecipesFromGithubJson(true);
      recipes = loadedRecipes.map(normalizeRecipe);
      saveLocalBackup();
      resetRecipeForm();
      renderRecipes();
      showGithubMessage(`Loaded ${recipes.length} recipe${recipes.length === 1 ? "" : "s"} from GitHub.`);
    } catch (error) {
      console.error(error);
      showGithubMessage(error.message || "Recipes could not be loaded from GitHub.", true);
    }
  });

  publishRecipesButton.addEventListener("click", async () => {
    clearGithubMessage();
    try {
      saveGithubSettingsFromForm(false);
      await publishRecipesToGitHub("Published current cookbook recipes");
      showGithubMessage("Current recipes were published to GitHub.");
    } catch (error) {
      console.error(error);
      showGithubMessage(error.message || "Recipes could not be published to GitHub.", true);
    }
  });
}

async function loadInitialRecipes() {
  try {
    const githubRecipes = await fetchRecipesFromGithubJson(false);
    if (githubRecipes.length) {
      const normalized = githubRecipes.map(normalizeRecipe);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      return normalized;
    }
  } catch (error) {
    console.warn("GitHub recipe file was not loaded. Falling back to local recipes.", error);
  }

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved).map(normalizeRecipe);
    } catch (error) {
      console.warn("Saved recipe data was not valid JSON. Loading starter recipes.", error);
    }
  }

  const seeds = seedRecipes.map(normalizeRecipe);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeds));
  return seeds;
}

async function handleRecipeSave() {
  if (isSavingRecipe) return;

  clearSaveMessage();
  clearGithubMessage();

  if (typeof recipeForm.reportValidity === "function" && !recipeForm.reportValidity()) {
    return;
  }

  const currentEditingId = editingRecipeId || editingRecipeIdInput.value;
  const existingRecipe = currentEditingId
    ? recipes.find((item) => item.id === currentEditingId)
    : null;

  if (currentEditingId && !existingRecipe) {
    showSaveMessage("This recipe could not be found for editing. Cancel edit and try again.", true);
    return;
  }

  isSavingRecipe = true;
  saveRecipeButton.disabled = true;
  saveRecipeButton.textContent = "Saving...";

  try {
    const formData = new FormData(recipeForm);
    let imagePath = await getRecipeImagePath(existingRecipe);

    const recipeData = {
      id: existingRecipe?.id || generateId(),
      title: getFormValue(formData, "title") || "Untitled Recipe",
      category: getFormValue(formData, "category") || "Family Favorite",
      prepTime: getFormValue(formData, "prepTime") || "—",
      cookTime: getFormValue(formData, "cookTime") || "—",
      servings: getFormValue(formData, "servings") || "—",
      source: getFormValue(formData, "source"),
      image: imagePath,
      ingredients: splitLines(formData.get("ingredients")),
      instructions: splitLines(formData.get("instructions")),
      notes: getFormValue(formData, "notes"),
      updatedAt: new Date().toISOString(),
      createdAt: existingRecipe?.createdAt || new Date().toISOString()
    };

    if (!recipeData.ingredients.length || !recipeData.instructions.length) {
      showSaveMessage("Please enter at least one ingredient and one instruction.", true);
      return;
    }

    const wasEditing = Boolean(existingRecipe);

    if (existingRecipe) {
      recipes = recipes.map((recipe) => (recipe.id === existingRecipe.id ? recipeData : recipe));
    } else {
      recipes.unshift(recipeData);
    }

    saveLocalBackup();
    renderRecipes();

    const publishResult = await autoPublishRecipes(wasEditing ? `Updated recipe: ${recipeData.title}` : `Added recipe: ${recipeData.title}`);

    resetRecipeForm({ keepMessage: true });
    searchInput.value = "";
    renderRecipes();

    const message = publishResult.published
      ? `"${recipeData.title}" was ${wasEditing ? "updated" : "saved"} and published to GitHub.`
      : `"${recipeData.title}" was ${wasEditing ? "updated" : "saved"} locally. Add GitHub settings and click Publish Current Recipes to make it public.`;

    showSaveMessage(message);

    const updatedCard = document.getElementById(slugify(recipeData.title));
    if (updatedCard) {
      updatedCard.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      document.querySelector("#recipes").scrollIntoView({ behavior: "smooth" });
    }
  } catch (error) {
    console.error("Recipe could not be saved.", error);
    showSaveMessage(error.message || "Something went wrong while saving. Check the recipe fields and try again.", true);
  } finally {
    isSavingRecipe = false;
    saveRecipeButton.disabled = false;
    setFormMode(editingRecipeId ? "edit" : "add", editStatusTitle.textContent);
  }
}

async function getRecipeImagePath(existingRecipe) {
  if (removeCurrentImage) return placeholderImage;

  const typedPath = imagePathInput.value.trim();

  if (selectedImageFile) {
    const settings = getGithubSettingsFromForm();
    validateGithubSettings(settings);

    const uploadedPath = await uploadImageToGitHub(selectedImageFile, settings, typedPath);
    imagePathInput.value = uploadedPath;
    return uploadedPath;
  }

  if (typedPath) return typedPath;
  if (existingRecipe?.image) return existingRecipe.image;
  return placeholderImage;
}

function renderRecipes() {
  const query = searchInput.value.trim().toLowerCase();
  const filteredRecipes = recipes.filter((recipe) => {
    const searchable = [
      recipe.title,
      recipe.category,
      recipe.prepTime,
      recipe.cookTime,
      recipe.servings,
      recipe.source,
      recipe.image,
      recipe.ingredients.join(" "),
      recipe.instructions.join(" "),
      recipe.notes
    ]
      .join(" ")
      .toLowerCase();

    return searchable.includes(query);
  });

  recipeCount.textContent = `${filteredRecipes.length} recipe${filteredRecipes.length === 1 ? "" : "s"}`;
  emptyState.hidden = filteredRecipes.length !== 0;
  recipesGrid.innerHTML = filteredRecipes.map(createRecipeCard).join("");
}

function createRecipeCard(recipe) {
  const sourceBlock = recipe.source
    ? `<p class="recipe-source"><strong>Source:</strong> ${escapeHTML(recipe.source)}</p>`
    : "";

  return `
    <article class="recipe-card" id="${slugify(recipe.title)}">
      <img class="recipe-image" src="${escapeAttribute(recipe.image || placeholderImage)}" alt="${escapeAttribute(recipe.title)}" loading="lazy" />
      <div class="recipe-content">
        <span class="recipe-category">${escapeHTML(recipe.category || "Family Favorite")}</span>
        <h3>${escapeHTML(recipe.title)}</h3>

        <dl class="recipe-meta">
          <div>
            <dt>Prep</dt>
            <dd>${escapeHTML(recipe.prepTime || "—")}</dd>
          </div>
          <div>
            <dt>Cook</dt>
            <dd>${escapeHTML(recipe.cookTime || "—")}</dd>
          </div>
          <div>
            <dt>Serves</dt>
            <dd>${escapeHTML(recipe.servings || "—")}</dd>
          </div>
        </dl>

        ${recipe.image && !recipe.image.startsWith("data:") ? `<p class="recipe-image-path"><strong>Image:</strong> ${escapeHTML(recipe.image)}</p>` : ""}
        ${sourceBlock}

        <section>
          <h4>Ingredients</h4>
          <ul>${recipe.ingredients.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul>
        </section>

        <section>
          <h4>Directions</h4>
          <ol>${recipe.instructions.map((step) => `<li>${escapeHTML(step)}</li>`).join("")}</ol>
        </section>

        ${recipe.notes ? `<p class="recipe-notes">${escapeHTML(recipe.notes)}</p>` : ""}

        <div class="recipe-actions">
          <button class="secondary-button" type="button" data-edit-id="${escapeAttribute(recipe.id)}">Edit Recipe</button>
          <button class="secondary-button" type="button" data-print-id="${escapeAttribute(recipe.id)}">Print Recipe</button>
          <button class="danger-button" type="button" data-delete-id="${escapeAttribute(recipe.id)}">Delete</button>
        </div>
      </div>
    </article>
  `;
}

function startEditingRecipe(recipeId) {
  clearSaveMessage();
  const recipe = recipes.find((item) => item.id === recipeId);
  if (!recipe) return;

  editingRecipeId = recipe.id;
  selectedImageFile = null;
  selectedImagePreviewData = "";
  removeCurrentImage = false;
  editingRecipeIdInput.value = recipe.id;

  recipeForm.elements.title.value = recipe.title || "";
  recipeForm.elements.category.value = recipe.category || "";
  recipeForm.elements.prepTime.value = recipe.prepTime || "";
  recipeForm.elements.cookTime.value = recipe.cookTime || "";
  recipeForm.elements.servings.value = recipe.servings || "";
  recipeForm.elements.source.value = recipe.source || "";
  recipeForm.elements.imagePath.value = recipe.image && !recipe.image.startsWith("data:") ? recipe.image : "";
  recipeForm.elements.ingredients.value = joinLines(recipe.ingredients);
  recipeForm.elements.instructions.value = joinLines(recipe.instructions);
  recipeForm.elements.notes.value = recipe.notes || "";
  imageInput.value = "";

  showImagePreview(recipe.image || placeholderImage, "Current Image");
  setFormMode("edit", recipe.title);
  document.querySelector("#add-recipe").scrollIntoView({ behavior: "smooth", block: "start" });
  setTimeout(() => recipeForm.elements.title.focus(), 350);
}

function resetRecipeForm(options = {}) {
  recipeForm.reset();
  selectedImageFile = null;
  selectedImagePreviewData = "";
  removeCurrentImage = false;
  editingRecipeId = "";
  editingRecipeIdInput.value = "";
  imagePathInput.value = "";
  hideImagePreview();
  setFormMode("add");
  if (!options.keepMessage) {
    clearSaveMessage();
  }
}

function setFormMode(mode, recipeTitle = "") {
  const editing = mode === "edit";

  formModeLabel.textContent = editing ? "Update a favorite" : "Preserve a favorite";
  formTitle.textContent = editing ? "Edit Recipe" : "Add a New Recipe";
  formHelpText.textContent = editing
    ? "Make any changes you need, then save to update this recipe. Leave the image upload blank to keep the current image."
    : "Add a recipe, optionally upload its image to GitHub, and publish the cookbook.";
  saveRecipeButton.textContent = editing ? "Update Recipe" : "Save Recipe";
  cancelEditButton.hidden = !editing;
  editStatus.hidden = !editing;
  editStatusTitle.textContent = recipeTitle;
}

function normalizeRecipe(recipe) {
  return {
    id: recipe.id || generateId(),
    title: recipe.title || "Untitled Recipe",
    category: recipe.category || "Family Favorite",
    prepTime: recipe.prepTime || "—",
    cookTime: recipe.cookTime || "—",
    servings: recipe.servings || "—",
    source: recipe.source || "",
    image: recipe.image || placeholderImage,
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : splitLines(recipe.ingredients || ""),
    instructions: Array.isArray(recipe.instructions) ? recipe.instructions : splitLines(recipe.instructions || ""),
    notes: recipe.notes || "",
    createdAt: recipe.createdAt || "",
    updatedAt: recipe.updatedAt || ""
  };
}

function saveLocalBackup() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
}

async function autoPublishRecipes(message) {
  const settings = getGithubSettingsFromForm();

  if (!hasUsableGithubSettings(settings)) {
    return { published: false };
  }

  try {
    await publishRecipesToGitHub(message);
    return { published: true };
  } catch (error) {
    console.error(error);
    showGithubMessage(error.message || "The recipe was saved locally, but publishing to GitHub failed.", true);
    return { published: false, error };
  }
}

async function uploadImageToGitHub(file, settings, requestedPath = "") {
  validateGithubSettings(settings);

  const folder = normalizeFolder(settings.imageFolder || "images");
  let targetPath = requestedPath.trim() || `${folder}/${sanitizeFileName(file.name)}`;
  targetPath = normalizeRepoPath(targetPath);

  if (!targetPath.startsWith(`${folder}/`)) {
    targetPath = `${folder}/${sanitizeFileName(targetPath.split("/").pop() || file.name)}`;
  }

  const dataUrl = await readFileAsDataURL(file);
  const base64Content = getBase64FromDataUrl(dataUrl);
  const message = `Upload recipe image: ${targetPath}`;

  await putGithubFile(targetPath, base64Content, message, settings);
  return targetPath;
}

async function publishRecipesToGitHub(message = "Update recipe cookbook") {
  if (isPublishing) return;

  const settings = getGithubSettingsFromForm();
  validateGithubSettings(settings);
  saveGithubSettingsFromForm(false);

  isPublishing = true;
  togglePublishingButtons(true);

  try {
    const publicRecipes = recipes.map(normalizeRecipe);
    const json = JSON.stringify(publicRecipes, null, 2);
    await putGithubFile(settings.recipesPath, stringToBase64(json), message, settings);
  } finally {
    isPublishing = false;
    togglePublishingButtons(false);
  }
}

async function fetchRecipesFromGithubJson(requireSettings) {
  const settings = getGithubSettingsFromForm();
  const path = normalizeRepoPath(settings.recipesPath || defaultGithubSettings.recipesPath);

  if (requireSettings) {
    if (!settings.owner || !settings.repo) {
      throw new Error("Enter your GitHub owner and repository name first.");
    }
  }

  if (settings.owner && settings.repo) {
    const apiPath = encodeRepoPath(path);
    const url = `https://api.github.com/repos/${encodeURIComponent(settings.owner)}/${encodeURIComponent(settings.repo)}/contents/${apiPath}?ref=${encodeURIComponent(settings.branch || "main")}`;
    const response = await fetch(url, {
      headers: buildGithubHeaders(settings, false)
    });

    if (!response.ok) {
      throw new Error(`GitHub recipe file was not found at ${path}.`);
    }

    const data = await response.json();
    const jsonText = base64ToString(data.content || "");
    const parsed = JSON.parse(jsonText);
    return Array.isArray(parsed) ? parsed : [];
  }

  const response = await fetch(`${path}?v=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Recipe file was not found at ${path}.`);
  const parsed = await response.json();
  return Array.isArray(parsed) ? parsed : [];
}

async function putGithubFile(path, base64Content, message, settings) {
  const cleanPath = normalizeRepoPath(path);
  const sha = await getGithubFileSha(cleanPath, settings);

  const body = {
    message,
    content: base64Content,
    branch: settings.branch || "main"
  };

  if (sha) body.sha = sha;

  const response = await fetch(githubContentUrl(cleanPath, settings), {
    method: "PUT",
    headers: buildGithubHeaders(settings, true),
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const details = await safeReadGithubError(response);
    throw new Error(`GitHub upload failed for ${cleanPath}. ${details}`.trim());
  }

  return response.json();
}

async function getGithubFileSha(path, settings) {
  const response = await fetch(`${githubContentUrl(path, settings)}?ref=${encodeURIComponent(settings.branch || "main")}`, {
    headers: buildGithubHeaders(settings, true)
  });

  if (response.status === 404) return "";

  if (!response.ok) {
    const details = await safeReadGithubError(response);
    throw new Error(`Could not check existing GitHub file ${path}. ${details}`.trim());
  }

  const data = await response.json();
  return data.sha || "";
}

function githubContentUrl(path, settings) {
  return `https://api.github.com/repos/${encodeURIComponent(settings.owner)}/${encodeURIComponent(settings.repo)}/contents/${encodeRepoPath(path)}`;
}

function buildGithubHeaders(settings, requireToken) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };

  if (settings.token) {
    headers.Authorization = `Bearer ${settings.token}`;
  } else if (requireToken) {
    throw new Error("Enter a GitHub token with repository contents read/write permission.");
  }

  return headers;
}

async function safeReadGithubError(response) {
  try {
    const error = await response.json();
    return error.message ? `GitHub says: ${error.message}` : "";
  } catch {
    return `${response.status} ${response.statusText}`;
  }
}

function validateGithubSettings(settings) {
  if (!settings.owner) throw new Error("Enter your GitHub owner / username.");
  if (!settings.repo) throw new Error("Enter your GitHub repository name.");
  if (!settings.branch) throw new Error("Enter your GitHub branch, usually main.");
  if (!settings.imageFolder) throw new Error("Enter the image folder. Use images.");
  if (normalizeFolder(settings.imageFolder) !== "images") {
    throw new Error("The image folder must be images so recipe photos save as images/filename.png.");
  }
  if (!settings.recipesPath) throw new Error("Enter the recipes JSON file path, usually data/recipes.json.");
  if (!settings.token) throw new Error("Enter a GitHub fine-grained token with repository contents read/write permission.");
}

function hasUsableGithubSettings(settings) {
  return Boolean(settings.owner && settings.repo && settings.branch && settings.imageFolder && settings.recipesPath && settings.token);
}

function loadGithubSettingsIntoForm() {
  const settings = getSavedGithubSettings();
  githubOwnerInput.value = settings.owner;
  githubRepoInput.value = settings.repo;
  githubBranchInput.value = settings.branch || "main";
  githubImageFolderInput.value = settings.imageFolder || "images";
  githubRecipesPathInput.value = settings.recipesPath || "data/recipes.json";
  githubTokenInput.value = settings.token || "";
}

function saveGithubSettingsFromForm(showMessage = true) {
  const settings = getGithubSettingsFromForm();
  localStorage.setItem(GITHUB_SETTINGS_KEY, JSON.stringify(settings));
  if (showMessage) showGithubMessage("GitHub settings saved on this browser.");
}

function getSavedGithubSettings() {
  const saved = localStorage.getItem(GITHUB_SETTINGS_KEY);
  if (!saved) return { ...defaultGithubSettings };

  try {
    return { ...defaultGithubSettings, ...JSON.parse(saved) };
  } catch {
    return { ...defaultGithubSettings };
  }
}

function getGithubSettingsFromForm() {
  return {
    owner: githubOwnerInput.value.trim(),
    repo: githubRepoInput.value.trim(),
    branch: githubBranchInput.value.trim() || "main",
    imageFolder: normalizeFolder(githubImageFolderInput.value.trim() || "images"),
    recipesPath: normalizeRepoPath(githubRecipesPathInput.value.trim() || "data/recipes.json"),
    token: githubTokenInput.value.trim()
  };
}

function togglePublishingButtons(disabled) {
  publishRecipesButton.disabled = disabled;
  loadGithubRecipesButton.disabled = disabled;
  saveGithubSettingsButton.disabled = disabled;
  saveRecipeButton.disabled = disabled || isSavingRecipe;
}

function splitLines(value) {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function joinLines(value) {
  return Array.isArray(value) ? value.join("\n") : String(value || "");
}

function getFormValue(formData, name) {
  return String(formData.get(name) || "").trim();
}

function showSaveMessage(message, isError = false) {
  if (!saveMessage) return;
  saveMessage.textContent = message;
  saveMessage.classList.toggle("error", isError);
}

function clearSaveMessage() {
  if (!saveMessage) return;
  saveMessage.textContent = "";
  saveMessage.classList.remove("error");
}

function showGithubMessage(message, isError = false) {
  if (!githubMessage) return;
  githubMessage.textContent = message;
  githubMessage.classList.toggle("error", isError);
}

function clearGithubMessage() {
  if (!githubMessage) return;
  githubMessage.textContent = "";
  githubMessage.classList.remove("error");
}

function showImagePreview(src, title) {
  imagePreviewTitle.textContent = title;
  imagePreview.src = src;
  imagePreviewWrap.hidden = false;
}

function hideImagePreview() {
  imagePreviewWrap.hidden = true;
  imagePreview.removeAttribute("src");
  imagePreviewTitle.textContent = "Image Preview";
}

function printRecipe(recipe) {
  const printFrame = document.createElement("iframe");
  printFrame.style.position = "fixed";
  printFrame.style.right = "0";
  printFrame.style.bottom = "0";
  printFrame.style.width = "0";
  printFrame.style.height = "0";
  printFrame.style.border = "0";
  document.body.appendChild(printFrame);

  const documentContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>${escapeHTML(recipe.title)}</title>
      <style>
        body { color: #2f241c; font-family: Georgia, "Times New Roman", serif; line-height: 1.5; margin: 36px; }
        img { width: 100%; max-height: 320px; object-fit: cover; border-radius: 18px; margin: 18px 0; }
        h1 { margin: 0 0 8px; font-size: 42px; }
        .category { color: #8a3d24; font-family: Arial, Helvetica, sans-serif; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
        .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 18px 0; }
        .meta div { border: 1px solid #eadcc9; border-radius: 12px; padding: 10px; }
        h2 { color: #5d2818; margin-top: 24px; }
        li { margin-bottom: 6px; }
        .source { color: #75685e; margin: 10px 0 0; }
        .notes { border-left: 4px solid #c7934a; padding-left: 14px; font-style: italic; }
        @page { margin: 0.65in; }
      </style>
    </head>
    <body>
      <p class="category">${escapeHTML(recipe.category || "Family Favorite")}</p>
      <h1>${escapeHTML(recipe.title)}</h1>
      ${recipe.source ? `<p class="source"><strong>Source:</strong> ${escapeHTML(recipe.source)}</p>` : ""}
      <img src="${escapeAttribute(recipe.image || placeholderImage)}" alt="${escapeAttribute(recipe.title)}" />
      <section class="meta">
        <div><strong>Prep:</strong><br>${escapeHTML(recipe.prepTime || "—")}</div>
        <div><strong>Cook:</strong><br>${escapeHTML(recipe.cookTime || "—")}</div>
        <div><strong>Serves:</strong><br>${escapeHTML(recipe.servings || "—")}</div>
      </section>
      <h2>Ingredients</h2>
      <ul>${recipe.ingredients.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul>
      <h2>Directions</h2>
      <ol>${recipe.instructions.map((step) => `<li>${escapeHTML(step)}</li>`).join("")}</ol>
      ${recipe.notes ? `<h2>Family Notes</h2><p class="notes">${escapeHTML(recipe.notes)}</p>` : ""}
    </body>
    </html>
  `;

  printFrame.contentDocument.open();
  printFrame.contentDocument.write(documentContent);
  printFrame.contentDocument.close();

  printFrame.onload = () => {
    printFrame.contentWindow.focus();
    printFrame.contentWindow.print();
    setTimeout(() => printFrame.remove(), 1000);
  };
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getBase64FromDataUrl(dataUrl) {
  return String(dataUrl).split(",")[1] || "";
}

function stringToBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

function base64ToString(value) {
  const cleaned = String(value || "").replace(/\s/g, "");
  const binary = atob(cleaned);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function sanitizeFileName(fileName) {
  const original = String(fileName || "recipe-image.png").trim();
  const lastDot = original.lastIndexOf(".");
  const rawName = lastDot > 0 ? original.slice(0, lastDot) : original;
  const rawExtension = lastDot > 0 ? original.slice(lastDot + 1) : "png";
  const safeName = slugify(rawName) || "recipe-image";
  const safeExtension = rawExtension.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  return `${safeName}.${safeExtension}`;
}

function normalizeFolder(value) {
  return normalizeRepoPath(value || "images").replace(/\/$/, "");
}

function normalizeRepoPath(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/")
    .trim();
}

function encodeRepoPath(path) {
  return normalizeRepoPath(path).split("/").map(encodeURIComponent).join("/");
}

function generateId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `recipe-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function slugify(value) {
  const slug = String(value || "recipe")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "recipe";
}

function escapeHTML(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value = "") {
  return escapeHTML(value).replace(/`/g, "&#096;");
}
