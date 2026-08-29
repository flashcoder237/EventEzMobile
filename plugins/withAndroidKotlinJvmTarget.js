/**
 * Expo Config Plugin — Aligne le jvmTarget Kotlin sur Java 17 pour TOUS les modules.
 *
 * Problème : certaines dépendances Kotlin compilent leur code en jvmTarget 11
 * alors que le projet compile son Java en 17. Les
 * versions récentes d'AGP / Kotlin Gradle refusent ce mismatch :
 *
 *   ❌ Inconsistent JVM-target compatibility detected for tasks
 *      'compileReleaseJavaWithJavac' (17) and 'compileReleaseKotlin' (11).
 *
 * Comme le projet est en Expo managed (pas de dossier android/ commité, généré
 * au build via prebuild), on ne peut pas éditer build.gradle à la main. Ce
 * plugin injecte dans le build.gradle RACINE un bloc qui force jvmTarget=17 sur
 * toutes les tâches KotlinCompile de tous les sous-projets. Le kotlin-gradle-
 * plugin étant sur le classpath buildscript (RN/Expo), la classe KotlinCompile
 * est résolvable ici. `configureEach` est lazy → n'impacte que les modules qui
 * compilent réellement du Kotlin.
 */
const { withProjectBuildGradle } = require('@expo/config-plugins');

const MARKER = '// eventez:kotlin-jvmtarget-17';
const SNIPPET = `
${MARKER}
allprojects {
    tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
        kotlinOptions {
            jvmTarget = "17"
        }
    }
}
`;

module.exports = function withAndroidKotlinJvmTarget(config) {
  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error(
        `withAndroidKotlinJvmTarget: build.gradle attendu en groovy, reçu "${cfg.modResults.language}"`,
      );
    }
    // Idempotent : ne réinjecte pas si déjà présent (rebuilds successifs).
    if (!cfg.modResults.contents.includes(MARKER)) {
      cfg.modResults.contents += `\n${SNIPPET}\n`;
    }
    return cfg;
  });
};
