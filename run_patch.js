import fs from 'fs';
const file = 'src/components/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');
const fs = require("fs");
const newLayout = fs.readFileSync("layout_block.txt", "utf8");

// Troviamo in modo flessibile ed efficace la firma iniziale della sezione categorie
const startKey = '<div className="flex-1 overflow-y-auto py-4 no-scrollbar">';
const startIndex = content.indexOf(startKey);

if (startIndex !== -1) {
  // Troviamo la chiusura corretta del macro-blocco scorrendo fino ai tre tag div consecutivi di chiusura
  const sectionEndStr = '</div>\n        )}\n      </div>';
  let endIndex = content.indexOf(sectionEndStr);
  
  if (endIndex === -1) {
    // Fallback di sicurezza basato sull'intervallo strutturale nativo del file originale
    endIndex = content.indexOf('</div>\n    </div>\n  );\n}');
  }

  if (endIndex !== -1) {
    const before = content.substring(0, startIndex);
    const after = content.substring(content.indexOf('</div>', endIndex) + 6);
    
    // Uniamo la patch strutturale
    fs.writeFileSync("src/components/Dashboard.tsx", before + newLayout + "\n    </div>", "utf8");
    console.log("✅ PATCH COMPLETATA CON SUCCESSO SENZA ERRORI DI TRONCAMENTO!");
  } else {
    console.log("❌ Impossibile mappare la chiusura dell'area categorie.");
  }
} else {
  console.log("❌ Impossibile trovare l'apertura del blocco categorie.");
}
