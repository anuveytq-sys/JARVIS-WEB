# JARVIS-WEB

JARVIS is a futuristic browser AI interface with modular voice, vision, automation, mission, calling, Beacon, and VELVE capabilities.

## JARVIS // INFERNO

Inferno is the isolated high-power command mode. It is designed as an orchestration layer over JARVIS capabilities rather than a replacement for the main HUD.

### Activation
- `Hey JARVIS, release Inferno`
- `Hey JARVIS, let Inferno come out`
- `Hey JARVIS, open Inferno`
- `Hey JARVIS, activate Inferno`

Inferno uses a minimal orange/red central core, lightning transition, bottom command console, settings access, diagnostic panels, and head/eye control hooks. `Return to JARVIS` restores the normal interface.

## Inferno capability matrix — 125 capabilities

1. Omni command orchestration
2. Multi-step mission planning
3. Parallel task planning
4. Natural-language intent routing
5. Context-aware command chaining
6. Mission checkpoints
7. Mission cancellation
8. Mission resume
9. Undo/restore mode
10. Priority queues
11. Web navigation
12. Web search
13. Multi-source research
14. Research synthesis
15. Fact extraction
16. Source comparison
17. Structured summaries
18. Timeline generation
19. Decision matrices
20. What-if analysis
21. Failure-mode analysis
22. Root-cause analysis
23. Recovery planning
24. Browser capability audit
25. Network diagnostics
26. Microphone diagnostics
27. Camera diagnostics
28. Speech-engine diagnostics
29. Permission audit
30. Storage audit
31. JARVIS health diagnostics
32. Module inventory
33. Module availability scan
34. UI self-test
35. Performance snapshot
36. Page visibility check
37. Wake-word status
38. Settings bridge
39. Core telemetry
40. Session event log
41. Vision screen inspection
42. UI element detection bridge
43. OCR/text extraction bridge
44. Image-analysis bridge
45. Visual comparison bridge
46. Chart interpretation bridge
47. Error-screen interpretation
48. Layout inspection
49. Accessibility inspection
50. Focus management
51. Head cursor control
52. Blink click control
53. Head scroll control
54. Gesture calibration
55. Gesture confidence gating
56. Keyboard fallback
57. Voice fallback
58. Typed command fallback
59. Command suggestions
60. Natural-language aliases
61. Email drafting
62. Email subject generation
63. Email reply drafting
64. WhatsApp message drafting
65. Message tone rewriting
66. Call handoff
67. Calendar planning
68. Reminder planning
69. Clipboard intelligence
70. File-selection assistance
71. YouTube workflow bridge
72. GitHub workflow bridge
73. Deployment-status inspection
74. Project navigation
75. Code explanation
76. Code drafting
77. Debugging guidance
78. Architecture planning
79. Documentation generation
80. Release-note generation
81. ChatGPT launcher
82. Claude launcher
83. Grok launcher
84. Google launcher
85. Maps launcher
86. Gmail launcher
87. GitHub launcher
88. YouTube launcher
89. Media launcher
90. External web handoff
91. OpenRouter reasoning
92. Model selection
93. Model fallback
94. Prompt orchestration
95. Structured JSON reasoning
96. Answer streaming bridge
97. Token-budget controls
98. Latency telemetry
99. AI error recovery
100. AI response summarization
101. Scenario simulation
102. Risk flagging
103. Confirmation gates
104. Permission-aware execution
105. Destructive-action confirmation
106. Sensitive-action confirmation
107. Action preview
108. Action receipts
109. Execution audit trail
110. Capability boundaries
111. Voice result narration
112. Speech queue
113. Speech cancellation
114. Voice-rate control
115. Voice-pitch control
116. Voice selection
117. Deep-voice preference
118. Visual result panels
119. Panel auto-close
120. Panel persistent close
121. Responsive Inferno HUD
122. Core animation states
123. Lightning transition
124. Orange-red command theme
125. Return-to-JARVIS transition

## OpenRouter

Inferno v2 includes an optional OpenRouter reasoning bridge. Never commit an API key to this repository. The browser UI can accept a user-provided key and keep it in local browser storage, but a production deployment should use a server-side proxy so the key is not exposed to client JavaScript. The model field is configurable in Inferno Settings.

## Voice

Inferno narrates AI results through the browser speech-synthesis system and exposes voice, rate, pitch, and cancellation controls. A specific third-party voice service is not bundled into the public repository because doing so would require the user's own service credentials and could expose those credentials in a static web app. A compatible licensed voice can be connected later through a secure backend.

## Browser capability boundary

Inferno is permission-aware. A web page cannot truthfully claim unrestricted control over every native phone/computer application, background microphone access, private account, or operating-system function. When a capability requires a native or privileged interface, Inferno uses an available browser/device handoff or reports that the capability is unavailable instead of pretending it completed the action.
