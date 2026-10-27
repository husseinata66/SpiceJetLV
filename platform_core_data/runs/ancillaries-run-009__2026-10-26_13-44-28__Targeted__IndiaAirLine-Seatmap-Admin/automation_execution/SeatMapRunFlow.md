# Seat Map Run Flow — Ancillaries Supplier Run (Runner)

Mermaid diagrams: open the Markdown preview in VS Code (needs a Mermaid-capable preview) or paste into https://mermaid.live.

## 1. End to end

```mermaid
flowchart TD
    A([New seat map supplier run requested]) --> B[Intake: Feature = Ancillaries,<br/>supplier, credential, capability checklist,<br/>Admin and/or Portal]
    B --> C[Create run per platform<br/>run_manager new --feature --supplier<br/>Admin = run 009, Portal = run 010]
    C --> D[Record supplier capabilities and rules<br/>Hold / Pay after Hold / Meal / Baggage / Seat / Bundle]
    D --> E[Capability gate plan<br/>cases needing an unsupported capability<br/>become Excluded - Not supported by supplier]
    E --> F[Apply human decisions<br/>exclusions, accepted behaviours,<br/>per-supplier settings in settings.local.json]
    F --> G[Human logs in once<br/>headed browser, session saved]
    G --> H{{For each Setup Group<br/>runner cli.js run --group NN --headless}}
    H --> I[Group run - see section 2]
    I --> J{More groups?}
    J -- yes --> H
    J -- no --> K[Assisted groups 14-17<br/>headed only, human presses Book / Hold / Pay]
    K --> L[Build report model from the latest valid group logs]
    L --> M[report_builder validate and build]
    M --> N([AutomationExecutionReport.html<br/>+ ExecutionSummaryAndFeedback.md])
    J -. groups 14-17 not approved .-> L
```

## 2. One Setup Group

```mermaid
flowchart TD
    S([Start group NN]) --> P[Load cases from the sheet<br/>apply capability plan and per-supplier case moves]
    P --> Q{Session valid?}
    Q -- no --> QB[Blocked: Not logged in<br/>log is ignored by the report] --> Z
    Q -- yes --> R[Search<br/>route, date, passengers, cabin]
    R --> T{Result card for the credential?}
    T -- no / HTTP 500 / 0 cards --> TB[Retry up to 3 times] --> T2{Still none?}
    T2 -- yes --> TC[Step stopped<br/>cases Blocked with the reason] --> Z
    T2 -- no --> U
    T -- yes --> U[Open card - accept Price Update pop-up if shown]
    U --> V[Passenger entry<br/>fake data typed by the script]
    V --> W{Fare package step?}
    W -- yes --> W1[Choose package] --> X
    W -- no --> X[Accept terms, go to step 2]
    X --> Y[Run the group's steps and checks]
    Y --> Y1[Seat map<br/>states, features, prices, exit seats,<br/>per-leg maps]
    Y --> Y2[Meals and baggage<br/>per passenger lists and prices]
    Y --> Y3[Round trip / price update<br/>group 09]
    Y --> Y4[Wallet and My Bookings<br/>group 13]
    Y1 --> R2
    Y2 --> R2
    Y3 --> R2
    Y4 --> R2[Classify each case]
    R2 --> Z([Write group log to automation_execution])
```

## 3. How each case gets its status

```mermaid
flowchart TD
    A[Case in the sheet] --> B{Needs a capability<br/>the supplier lacks, or human-excluded?}
    B -- yes --> EX[Excluded]
    B -- no --> C{Premise exists for this supplier?<br/>e.g. fare package with seats}
    C -- no --> NA[Not applicable]
    C -- yes --> D{Group not run<br/>real money / not approved?}
    D -- yes --> NR[Not run]
    D -- no --> E{Could the step be reached?}
    E -- no: timeout, no data, missing setting --> BL[Blocked - reason recorded]
    E -- yes --> F{Can the seat map alone judge it?<br/>exit seat rule is enforced at booking}
    F -- no --> IN[Inconclusive]
    F -- yes --> G{Check satisfied?}
    G -- yes --> P[Passed<br/>accepted behaviours carry a note]
    G -- no --> H[Failed<br/>screenshot with red outline, reason lists seats]
```

## 4. Assisted groups 14–17 (headed only)

```mermaid
flowchart LR
    A[Runner builds the booking] --> B[Stops before Book / Hold<br/>red banner]
    B --> C[Human presses the button<br/>Group 17: Hold, then Pay And Book > Pay]
    C --> D[Runner does the read-only checks]
    D --> E[Results in the group log]
```
