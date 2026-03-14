export const INGREDIENT_CATEGORIES = [
  {
    id: "vegetables",
    label: "Vegetables",
    icon: "🥦",
    items: [
      "Capsicum", "Zucchini", "Eggplant", "Spinach", "Kale", "Broccoli",
      "Cauliflower", "Carrot", "Beetroot", "Sweet Potato", "Potato", "Pumpkin",
      "Tomato", "Cherry Tomato", "Cucumber", "Corn", "Asparagus", "Leek",
      "Celery", "Fennel", "Cabbage", "Bok Choy", "Mushroom", "Onion",
      "Red Onion", "Spring Onion", "Garlic", "Ginger", "Chilli", "Avocado",
      "Lettuce", "Rocket", "Silverbeet",
    ],
  },
  {
    id: "proteins",
    label: "Proteins",
    icon: "🥩",
    items: [
      "Chicken Breast", "Chicken Thigh", "Beef Mince", "Steak", "Lamb Cutlet",
      "Pork Belly", "Bacon", "Chorizo", "Prosciutto", "Salami", "Ham", "Eggs",
      "Tofu", "Tempeh", "Lentils", "Chickpeas", "Black Beans", "Kidney Beans",
      "White Beans",
    ],
  },
  {
    id: "dairy",
    label: "Dairy",
    icon: "🧀",
    items: [
      "Milk", "Cream", "Butter", "Parmesan", "Feta", "Ricotta", "Mozzarella",
      "Cheddar", "Brie", "Goat Cheese", "Cream Cheese", "Sour Cream",
      "Yoghurt", "Greek Yoghurt", "Crème Fraîche", "Mascarpone",
    ],
  },
  {
    id: "seafood",
    label: "Seafood",
    icon: "🐟",
    items: [
      "Salmon", "Tuna", "Barramundi", "Snapper", "Prawns", "Calamari",
      "Mussels", "Oysters", "Crab", "Smoked Salmon", "Sardines", "Anchovies",
    ],
  },
  {
    id: "grains",
    label: "Grains & Bread",
    icon: "🌾",
    items: [
      "Sourdough", "Puff Pastry", "Shortcrust Pastry", "Pasta", "Penne",
      "Spaghetti", "Risotto Rice", "Basmati Rice", "Quinoa", "Polenta",
      "Couscous", "Bread Crumbs", "Flour", "Pita Bread", "Tortilla", "Oats",
    ],
  },
  {
    id: "fruits",
    label: "Fruits",
    icon: "🍋",
    items: [
      "Lemon", "Lime", "Orange", "Apple", "Pear", "Mango", "Banana",
      "Strawberry", "Blueberry", "Raspberry", "Peach", "Plum", "Fig",
      "Pomegranate", "Passionfruit", "Watermelon", "Grape", "Dates",
    ],
  },
  {
    id: "herbs",
    label: "Herbs & Spices",
    icon: "🌿",
    items: [
      "Basil", "Thyme", "Rosemary", "Oregano", "Parsley", "Coriander",
      "Mint", "Dill", "Tarragon", "Chives", "Bay Leaf", "Cumin", "Paprika",
      "Smoked Paprika", "Turmeric", "Coriander Powder", "Chilli Flakes",
      "Cinnamon", "Cardamom", "Star Anise", "Sumac", "Za'atar",
      "Curry Powder", "Garam Masala",
    ],
  },
  {
    id: "pantry",
    label: "Pantry",
    icon: "🫙",
    items: [
      "Olive Oil", "Vegetable Oil", "Sesame Oil", "Soy Sauce", "Fish Sauce",
      "Oyster Sauce", "Worcestershire", "Balsamic Vinegar", "White Wine Vinegar",
      "Red Wine Vinegar", "Honey", "Maple Syrup", "Dijon Mustard", "Tomato Paste",
      "Coconut Milk", "Chicken Stock", "Vegetable Stock", "Beef Stock",
      "Capers", "Olives", "Sun-dried Tomato", "Tahini", "Miso Paste",
      "Harissa", "Preserved Lemon",
    ],
  },
];

// Flat list of all ingredients with their category — used for search
export const ALL_INGREDIENTS = INGREDIENT_CATEGORIES.flatMap((cat) =>
  cat.items.map((name) => ({ name, category: cat.id }))
);

// Popular / featured ingredients for demo "Featured" tab
export const FEATURED_INGREDIENT_NAMES = [
  "Cabbage",
  "Chicken Breast",
  "Steak",
  "Pork Belly",
  "Bacon",
  "Eggs",
  "Avocado",
  "Mushroom",
];
