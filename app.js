const STORAGE_KEY = "mcintyreRecipeBook.recipes";
const INIT_KEY = "mcintyreRecipeBook.seeded";

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
    id: generateId(),
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
    id: generateId(),
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
    id: generateId(),
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

let recipes = loadRecipes();
let selectedImageData = "";
let removeCurrentImage = false;
let editingRecipeId = "";

const recipesGrid = document.querySelector("#recipes-grid");
const recipeCount = document.querySelector("#recipe-count");
const emptyState = document.querySelector("#empty-state");
const searchInput = document.querySelector("#recipe-search");
const recipeForm = document.querySelector("#recipe-form");
const imageInput = document.querySelector("#recipe-image");
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

currentYear.textContent = new Date().getFullYear();
renderRecipes();

searchInput.addEventListener("input", renderRecipes);
cancelEditButton.addEventListener("click", resetRecipeForm);
removeImageButton.addEventListener("click", () => {
  selectedImageData = "";
  removeCurrentImage = true;
  imageInput.value = "";
  showImagePreview(placeholderImage, "Placeholder Image");
});

imageInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];

  if (!file) {
    selectedImageData = "";
    removeCurrentImage = false;

    if (editingRecipeId) {
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

  selectedImageData = await readFileAsDataURL(file);
  removeCurrentImage = false;
  showImagePreview(selectedImageData, editingRecipeId ? "New Replacement Image" : "Image Preview");
});

recipeForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(recipeForm);
  const existingRecipe = editingRecipeId
    ? recipes.find((item) => item.id === editingRecipeId)
    : null;

  const recipeData = {
    id: existingRecipe?.id || generateId(),
    title: formData.get("title").trim(),
    category: formData.get("category").trim() || "Family Favorite",
    prepTime: formData.get("prepTime").trim() || "—",
    cookTime: formData.get("cookTime").trim() || "—",
    servings: formData.get("servings").trim() || "—",
    source: formData.get("source").trim(),
    image: getSavedImage(existingRecipe),
    ingredients: splitLines(formData.get("ingredients")),
    instructions: splitLines(formData.get("instructions")),
    notes: formData.get("notes").trim(),
    updatedAt: new Date().toISOString(),
    createdAt: existingRecipe?.createdAt || new Date().toISOString()
  };

  if (existingRecipe) {
    recipes = recipes.map((recipe) => (recipe.id === existingRecipe.id ? recipeData : recipe));
  } else {
    recipes.unshift(recipeData);
  }

  saveRecipes();
  resetRecipeForm();
  searchInput.value = "";
  renderRecipes();

  const updatedCard = document.getElementById(slugify(recipeData.title));
  if (updatedCard) {
    updatedCard.scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    document.querySelector("#recipes").scrollIntoView({ behavior: "smooth" });
  }
});

recipesGrid.addEventListener("click", (event) => {
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
    saveRecipes();

    if (editingRecipeId === recipe.id) {
      resetRecipeForm();
    }

    renderRecipes();
  }
});

function loadRecipes() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (saved) {
    try {
      return JSON.parse(saved).map(normalizeRecipe);
    } catch (error) {
      console.warn("Saved recipe data was not valid JSON. Loading starter recipes.", error);
    }
  }

  if (!localStorage.getItem(INIT_KEY)) {
    localStorage.setItem(INIT_KEY, "true");
  }

  const normalizedSeeds = seedRecipes.map(normalizeRecipe);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedSeeds));
  return normalizedSeeds;
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

function saveRecipes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
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
  const recipe = recipes.find((item) => item.id === recipeId);
  if (!recipe) return;

  editingRecipeId = recipe.id;
  selectedImageData = "";
  removeCurrentImage = false;
  editingRecipeIdInput.value = recipe.id;

  recipeForm.elements.title.value = recipe.title || "";
  recipeForm.elements.category.value = recipe.category || "";
  recipeForm.elements.prepTime.value = recipe.prepTime || "";
  recipeForm.elements.cookTime.value = recipe.cookTime || "";
  recipeForm.elements.servings.value = recipe.servings || "";
  recipeForm.elements.source.value = recipe.source || "";
  recipeForm.elements.ingredients.value = joinLines(recipe.ingredients);
  recipeForm.elements.instructions.value = joinLines(recipe.instructions);
  recipeForm.elements.notes.value = recipe.notes || "";
  imageInput.value = "";

  showImagePreview(recipe.image || placeholderImage, "Current Image");
  setFormMode("edit", recipe.title);
  document.querySelector("#add-recipe").scrollIntoView({ behavior: "smooth", block: "start" });
  setTimeout(() => recipeForm.elements.title.focus(), 350);
}

function resetRecipeForm() {
  recipeForm.reset();
  selectedImageData = "";
  removeCurrentImage = false;
  editingRecipeId = "";
  editingRecipeIdInput.value = "";
  hideImagePreview();
  setFormMode("add");
}

function setFormMode(mode, recipeTitle = "") {
  const editing = mode === "edit";

  formModeLabel.textContent = editing ? "Update a favorite" : "Preserve a favorite";
  formTitle.textContent = editing ? "Edit Recipe" : "Add a New Recipe";
  formHelpText.textContent = editing
    ? "Make any changes you need, then save to update this recipe. Leave the image blank to keep the current one."
    : "Recipes you add are saved in this browser using local storage.";
  saveRecipeButton.textContent = editing ? "Update Recipe" : "Save Recipe";
  cancelEditButton.hidden = !editing;
  editStatus.hidden = !editing;
  editStatusTitle.textContent = recipeTitle;
}

function getSavedImage(existingRecipe) {
  if (removeCurrentImage) return placeholderImage;
  if (selectedImageData) return selectedImageData;
  if (existingRecipe?.image) return existingRecipe.image;
  return placeholderImage;
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
        body {
          color: #2f241c;
          font-family: Georgia, "Times New Roman", serif;
          line-height: 1.5;
          margin: 36px;
        }
        img {
          width: 100%;
          max-height: 320px;
          object-fit: cover;
          border-radius: 18px;
          margin: 18px 0;
        }
        h1 {
          margin: 0 0 8px;
          font-size: 42px;
        }
        .category {
          color: #8a3d24;
          font-family: Arial, Helvetica, sans-serif;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .meta {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin: 18px 0;
        }
        .meta div {
          border: 1px solid #eadcc9;
          border-radius: 12px;
          padding: 10px;
        }
        h2 {
          color: #5d2818;
          margin-top: 24px;
        }
        li {
          margin-bottom: 6px;
        }
        .source {
          color: #75685e;
          margin: 10px 0 0;
        }
        .notes {
          border-left: 4px solid #c7934a;
          padding-left: 14px;
          font-style: italic;
        }
        @page {
          margin: 0.65in;
        }
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
