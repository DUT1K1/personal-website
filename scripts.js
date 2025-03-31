// Define your translations
const translations = {
  en: {
    nav_home: "Home",
    nav_about: "About",
    nav_projects: "Projects",
    nav_experience: "Experience",
    nav_contact: "Contact",
    nav_blog: "Blog",

    contact_heading: "Contact",
    contact_description: "Feel free to reach out!",
    // etc.
  },
  ge: {
    nav_home: "მთავარი",
    nav_about: "ჩემს შესახებ",
    nav_projects: "პროექტები",
    nav_experience: "გამოცდილება",
    nav_contact: "კონტაქტი",
    nav_blog: "ბლოგი",

    contact_heading: "კონტაქტი",
    contact_description: "გთხოვთ დამიკავშირდეთ!",
    // etc.
  },
};

// Function to update language
function setLanguage(lang) {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (translations[lang] && translations[lang][key]) {
      el.innerText = translations[lang][key];
    }
  });
}

// Set a default language (optional)
document.addEventListener("DOMContentLoaded", () => {
  setLanguage("en");
});
