async function testApi() {
  console.log("Démarrage du test de l'API DeepSeek locale (http://localhost:3000/api/generate)...");
  
  const sampleText = `La thermodynamique classique est une branche de la physique qui étudie les relations entre la chaleur, le travail et l'énergie à l'échelle macroscopique. Elle repose sur quatre principes fondamentaux : le principe zéro (équilibre thermique), le premier principe (conservation de l'énergie), le deuxième principe (entropie et irréversibilité) et le troisième principe (zéro absolu de la température).`;

  try {
    const response = await fetch('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ text: sampleText })
    });

    console.log("Statut HTTP:", response.status, response.statusText);
    
    const bodyText = await response.text();
    console.log("\n--- Réponse Brute ---");
    console.log(bodyText);
    
    try {
      const data = JSON.parse(bodyText);
      console.log("\n✅ Succès ! L'API a répondu avec un JSON valide :");
      console.log(JSON.stringify(data, null, 2));
    } catch(e) {
      console.log("\n❌ Échec : La réponse n'est pas un JSON valide.");
    }
    
  } catch (error) {
    console.error("\n❌ Erreur réseau lors de l'appel :", error.message);
  }
}

testApi();
