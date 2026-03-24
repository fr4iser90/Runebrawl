1️⃣ Brainstorm / Prototype Phase
Goal: Test gameplay, validate mechanics, and check the flow.
Important: No final assets yet!
Use placeholders:
Fighters/Units: simple colored shapes (circles, rectangles, icons)
Shop: simple buttons/boxes
Battlefield/Bench: grid or table layout
Drag & Drop: simple borders, highlights

✅ Benefit: You can immediately see if auto-combat, shop flow, drag & drop, and bench/board slots work as intended.

2️⃣ UI / CSS vs. Assets
Build CSS/UI first:
Placeholder UI gives feedback on layout and usability
Fast to adjust, no dependency on a designer
Animations & hover effects → important for readability
Assets later:
Once gameplay is stable → bring in spriter/artist for units, shop icons, particles
Prevents spending time on assets that might get discarded
3️⃣ Iterative Approach
Core loop in a minimal version (phase/round + auto-combat + buy phase)
Placeholder UI & CSS → check usability, spacing, hover, drag & drop
Gameplay tweaks → once the mechanics are solid
Assets & VFX layer → now it makes sense to add detailed sprites, icons, particles

💡 Extra tip:

Use colored shapes + numbers + labels instead of full sprites.
Animations can be done directly via CSS / GSAP / Framer Motion, even without art assets.
This way, you immediately see if an ability’s feedback is understandable before spending hours on assets.