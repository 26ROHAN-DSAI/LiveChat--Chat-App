const fs = require('fs');
const path = require('path');

// Define the folder structure
const folderStructure = {
    "public": ["index.html", "styles.css", "client.js"],
    "": ["server.js", ".env", "package.json", "README.md"]
};

// Function to create folders and files
function createStructure(basePath, structure) {
    for (const [folder, contents] of Object.entries(structure)) {
        const folderPath = path.join(basePath, folder);
        if (folder) {
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
                console.log(`Created folder: ${folderPath}`);
            }
        }

        if (Array.isArray(contents)) {
            contents.forEach((file) => {
                const filePath = path.join(folderPath, file);
                if (!fs.existsSync(filePath)) {
                    fs.writeFileSync(filePath, '');
                    console.log(`Created file: ${filePath}`);
                }
            });
        } else if (typeof contents === 'object') {
            createStructure(folderPath, contents);
        }
    }
}

// Create the folder structure
const basePath = path.resolve(__dirname);
createStructure(basePath, folderStructure);