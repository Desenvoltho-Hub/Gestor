# Gestor - Simple Business Management App

Gestor is a lightweight, client-side business management application designed for small businesses and freelancers. It runs entirely in your browser, using Local Storage to save your data, ensuring your information stays private on your own device.

## ✨ Features

*   **Dashboard:** Get a quick overview of your financial health with total and monthly summaries (balance, revenue, expenses).
*   **Financial Management:** Track all your income (receitas) and expenses (despesas) with a simple transaction log.
*   **Sales CRM:**
    *   **Pipeline:** Visualize and manage your sales opportunities using a drag-and-drop Kanban board.
    *   **Clients:** Maintain a simple database of your clients' contact information.
*   **Reporting:** Generate financial and sales reports for specific date ranges, complete with visual charts and text analysis.
*   **Data Export:** Export your reports and data to PDF for record-keeping or sharing.
*   **Backup & Restore:** Easily save your entire application data to a JSON file and restore it whenever needed. No server, no accounts, full data ownership.
*   **Responsive Design:** Works on both desktop and mobile devices.

## 🚀 How to Run

This is a pure front-end application with no server or build dependencies.

1.  Clone or download this repository.
2.  Open the `index.html` file in any modern web browser (like Chrome, Firefox, or Edge).
3.  That's it! The application will start running.

All data is stored in your browser's Local Storage.

## 🛠 Tech Stack

*   **HTML5**
*   **CSS3** (with Font Awesome for icons)
*   **TypeScript**
*   **No Frameworks:** Built with vanilla TypeScript for maximum performance and simplicity.
*   **Libraries:**
    *   Chart.js for data visualization.
    *   Marked.js for Markdown rendering in reports.
    *   jsPDF & jsPDF-AutoTable for PDF generation.

## 📄 License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.