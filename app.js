const STORAGE_KEY = "mcintyreRecipeBook.recipes";

const siteConfig = window.COOKBOOK_CONFIG || {};
const recipesPath = siteConfig.recipesPath || "data/recipes.json";

const placeholderImage =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="675" viewBox="0 0 900 675">
      <rect width="900" height="675" fill="#fff8ed"/>
      <circle cx="450" cy="300" r="130" fill="#eadcc9"/>
      <path d="M285 472h330" stroke="#8a3d24" stroke-width="22" stroke-linecap="round"/>
      <path d="M350 340c40 58 160 58 200 0" fill="none" stroke="#8a3d24" stroke-width="24" stroke-linecap="round"/>
      <text x="450" y="560" text-anchor="middle" font-size="52" font-family="Georgia" fill="#5d2818">
        Family Recipe
      </text>
    </svg>
  `);

let recipes = [];

const recipesGrid = document.querySelector("#recipes-grid");
const recipeCount = document.querySelector("#recipe-count");
const emptyState = document.querySelector("#empty-state");
const searchInput = document.querySelector("#recipe-search");
const currentYear = document.querySelector("#current-year");

initializeApp();

async function initializeApp() {
  if (currentYear) {
    currentYear.textContent = new Date().getFullYear();
  }

  if (searchInput) {
    searchInput.addEventListener("input", renderRecipes);
  }

  if (recipesGrid) {
    recipesGrid.addEventListener("click", (event) => {
      const printButton = event.target.closest("[data-print-id]");

      if (!printButton) {
        return;
      }

      const recipe = recipes.find(
        (item) => item.id === printButton.dataset.printId
      );

      if (recipe) {
        printRecipe(recipe);
      }
    });
  }

  recipes = await loadInitialRecipes();
  renderRecipes();
}

async function loadInitialRecipes() {
  try {
    const response = await fetch(
      `${recipesPath}?v=${Date.now()}`,
      {
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(
        `Published recipe file was not found at ${recipesPath}.`
      );
    }

    const parsed = await response.json();

    if (!Array.isArray(parsed)) {
      throw new Error(
        `${recipesPath} must contain a JSON array of recipes.`
      );
    }

    const normalized = parsed.map(normalizeRecipe);

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(normalized)
      );
    } catch (error) {
      console.warn(
        "Could not save recipe backup to localStorage.",
        error
      );
    }

    return normalized;
  } catch (error) {
    console.warn(
      "Published recipe file could not be loaded.",
      error
    );

    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          return parsed.map(normalizeRecipe);
        }
      }
    } catch (backupError) {
      console.warn(
        "Local recipe backup could not be loaded.",
        backupError
      );
    }

    return [];
  }
}

function renderRecipes() {
  if (!recipesGrid) {
    return;
  }

  const query = searchInput
    ? searchInput.value.trim().toLowerCase()
    : "";

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

  if (recipeCount) {
    recipeCount.textContent =
      `${filteredRecipes.length} recipe${
        filteredRecipes.length === 1 ? "" : "s"
      }`;
  }

  if (emptyState) {
    emptyState.hidden =
      filteredRecipes.length !== 0;
  }

  recipesGrid.innerHTML = filteredRecipes
    .map(createRecipeCard)
    .join("");
}

function createRecipeCard(recipe) {
  const sourceBlock = recipe.source
    ? `
      <p class="recipe-source">
        <strong>Source:</strong>
        ${escapeHTML(recipe.source)}
      </p>
    `
    : "";

  return `
    <article
      class="recipe-card"
      id="${slugify(recipe.title)}"
    >
      <img
        class="recipe-image"
        src="${escapeAttribute(
          recipe.image || placeholderImage
        )}"
        alt="${escapeAttribute(recipe.title)}"
        loading="lazy"
      />

      <div class="recipe-content">
        <span class="recipe-category">
          ${escapeHTML(
            recipe.category || "Family Favorite"
          )}
        </span>

        <h3>
          ${escapeHTML(recipe.title)}
        </h3>

        <dl class="recipe-meta">
          <div>
            <dt>Prep</dt>
            <dd>
              ${escapeHTML(
                recipe.prepTime || "—"
              )}
            </dd>
          </div>

          <div>
            <dt>Cook</dt>
            <dd>
              ${escapeHTML(
                recipe.cookTime || "—"
              )}
            </dd>
          </div>

          <div>
            <dt>Serves</dt>
            <dd>
              ${escapeHTML(
                recipe.servings || "—"
              )}
            </dd>
          </div>
        </dl>

        ${sourceBlock}

        <section>
          <h4>Ingredients</h4>

          <ul>
            ${recipe.ingredients
              .map(
                (item) =>
                  `<li>${escapeHTML(item)}</li>`
              )
              .join("")}
          </ul>
        </section>

        <section>
          <h4>Directions</h4>

          <ol>
            ${recipe.instructions
              .map(
                (step) =>
                  `<li>${escapeHTML(step)}</li>`
              )
              .join("")}
          </ol>
        </section>

        ${
          recipe.notes
            ? `
              <p class="recipe-notes">
                ${escapeHTML(recipe.notes)}
              </p>
            `
            : ""
        }

        <div class="recipe-actions">
          <button
            class="secondary-button"
            type="button"
            data-print-id="${escapeAttribute(
              recipe.id
            )}"
          >
            Print Recipe
          </button>
        </div>
      </div>
    </article>
  `;
}

function normalizeRecipe(recipe) {
  return {
    id:
      recipe.id ||
      generateId(),

    title:
      recipe.title ||
      "Untitled Recipe",

    category:
      recipe.category ||
      "Family Favorite",

    prepTime:
      recipe.prepTime ||
      "—",

    cookTime:
      recipe.cookTime ||
      "—",

    servings:
      recipe.servings ||
      "—",

    source:
      recipe.source ||
      "",

    image:
      recipe.image ||
      placeholderImage,

    ingredients:
      Array.isArray(recipe.ingredients)
        ? recipe.ingredients
        : splitLines(
            recipe.ingredients || ""
          ),

    instructions:
      Array.isArray(recipe.instructions)
        ? recipe.instructions
        : splitLines(
            recipe.instructions || ""
          ),

    notes:
      recipe.notes ||
      "",

    createdAt:
      recipe.createdAt ||
      "",

    updatedAt:
      recipe.updatedAt ||
      ""
  };
}

function splitLines(value) {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function printRecipe(recipe) {
  const printFrame =
    document.createElement("iframe");

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

      <title>
        ${escapeHTML(recipe.title)}
      </title>

      <style>
        body {
          color: #2f241c;
          font-family:
            Georgia,
            "Times New Roman",
            serif;
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
          font-family:
            Arial,
            Helvetica,
            sans-serif;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .meta {
          display: grid;
          grid-template-columns:
            repeat(3, 1fr);
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
          border-left:
            4px solid #c7934a;
          padding-left: 14px;
          font-style: italic;
        }

        @page {
          margin: 0.65in;
        }
      </style>
    </head>

    <body>
      <p class="category">
        ${escapeHTML(
          recipe.category ||
            "Family Favorite"
        )}
      </p>

      <h1>
        ${escapeHTML(recipe.title)}
      </h1>

      ${
        recipe.source
          ? `
            <p class="source">
              <strong>Source:</strong>
              ${escapeHTML(recipe.source)}
            </p>
          `
          : ""
      }

      <img
        src="${escapeAttribute(
          recipe.image || placeholderImage
        )}"
        alt="${escapeAttribute(
          recipe.title
        )}"
      />

      <section class="meta">
        <div>
          <strong>Prep:</strong>
          <br />
          ${escapeHTML(
            recipe.prepTime || "—"
          )}
        </div>

        <div>
          <strong>Cook:</strong>
          <br />
          ${escapeHTML(
            recipe.cookTime || "—"
          )}
        </div>

        <div>
          <strong>Serves:</strong>
          <br />
          ${escapeHTML(
            recipe.servings || "—"
          )}
        </div>
      </section>

      <h2>Ingredients</h2>

      <ul>
        ${recipe.ingredients
          .map(
            (item) =>
              `<li>${escapeHTML(item)}</li>`
          )
          .join("")}
      </ul>

      <h2>Directions</h2>

      <ol>
        ${recipe.instructions
          .map(
            (step) =>
              `<li>${escapeHTML(step)}</li>`
          )
          .join("")}
      </ol>

      ${
        recipe.notes
          ? `
            <h2>Family Notes</h2>

            <p class="notes">
              ${escapeHTML(recipe.notes)}
            </p>
          `
          : ""
      }
    </body>
    </html>
  `;

  printFrame.contentDocument.open();
  printFrame.contentDocument.write(
    documentContent
  );
  printFrame.contentDocument.close();

  printFrame.onload = () => {
    printFrame.contentWindow.focus();
    printFrame.contentWindow.print();

    setTimeout(() => {
      printFrame.remove();
    }, 1000);
  };
}

function generateId() {
  if (
    window.crypto &&
    typeof window.crypto.randomUUID ===
      "function"
  ) {
    return window.crypto.randomUUID();
  }

  return (
    "recipe-" +
    Date.now() +
    "-" +
    Math.random()
      .toString(16)
      .slice(2)
  );
}

function slugify(value) {
  const slug = String(
    value || "recipe"
  )
    .toLowerCase()
    .trim()
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    );

  return slug || "recipe";
}

function escapeHTML(value = "") {
  return String(value)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}

function escapeAttribute(
  value = ""
) {
  return escapeHTML(
    value
  ).replace(
    /`/g,
    "&#096;"
  );
}
