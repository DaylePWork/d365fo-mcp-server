/**
 * MCP tool definition for `d365fo_file` (name/description/inputSchema),
 * extracted verbatim from mcpServer.ts. Serialized payload must not change
 * unintentionally — tests/utils/toolSchemaBudget.test.ts ratchets its size.
 */

export const d365foFileTool = {
    name: 'd365fo_file',
    description: `Create, modify, or generate a D365FO AOT object. Choose an \`action\`:
• create → write a NEW object file into PackagesLocalDirectory (UTF-8 BOM, auto-added to .rnrproj). THE WRITE STEP — incomplete until isError=false; treat ⚠️/❌ as failure. Extensions: objectName="BaseObject.PrefixExtension". (Windows)
• modify → edit an EXISTING object via IMetadataProvider. APPLIES IMMEDIATELY, no dry-run — get user confirmation BEFORE calling; revert with undo_last_modification. Requires \`operation\`. (Windows)
• generate → XML as TEXT only, no write (Azure/Linux fallback when create reports "requires file system access"); save it yourself with UTF-8 BOM. ALWAYS try action=create first.

Model from .mcp.json; prefix auto-applied from EXTENSION_PREFIX. Classes: member vars inside the class { }, methods after the closing }.`,
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['create', 'modify', 'generate'],
          description: 'create = new object file (write); modify = edit existing object (write); generate = XML text only (no write).',
        },
        objectType: {
          type: 'string',
          enum: [
            'class', 'table', 'enum', 'form', 'query', 'view', 'data-entity', 'report', 'edt',
            'table-extension', 'class-extension', 'form-extension', 'enum-extension', 'edt-extension',
            'data-entity-extension', 'menu-item-display-extension',
            'menu-item-action-extension', 'menu-item-output-extension', 'menu-extension',
            'menu-item-display', 'menu-item-action', 'menu-item-output', 'menu',
            'security-privilege', 'security-duty', 'security-role',
            'security-duty-extension', 'security-role-extension',
            'business-event', 'tile', 'kpi', 'map',
          ],
          description:
            'Each security/menu-item type maps to its own AOT folder — NEVER use security-privilege for duty or role. ' +
            'class-extension = [ExtensionOf] final class skeleton; business-event = BusinessEventsBase + Contract pair. ' +
            '[modify] supports class/table/form/enum/query/view/edt/data-entity/report + their *-extension variants. ' +
            '[generate] supports class/table/enum/form/query/view/data-entity/report + table/form/enum/edt/data-entity-extension.'
        },
        objectName: {
          type: 'string',
          description: 'Base name WITHOUT model prefix — the tool prepends EXTENSION_PREFIX (or modelName) and detects an existing prefix. Extension classes: pass "{Base}_Extension" with NO prefix infix (the tool produces e.g. "SalesFormLetterMY_Extension"). NEVER hand-build the prefix.'
        },
        modelName: {
          type: 'string',
          description: 'Target model name — auto-detected from .mcp.json if omitted. NEVER guess or take model names from search results (those are source models).'
        },
        packageName: {
          type: 'string',
          description: 'Package name — auto-resolved from model name; pass only when they differ.',
        },
        packagePath: {
          type: 'string',
          description: 'Base package path (default: K:\\AosService\\PackagesLocalDirectory). [modify] also locates objects outside the default dir; for models outside bridge startup roots set D365FO_CUSTOM_PACKAGES_PATH or pass filePath.'
        },
        sourceCode: {
          type: 'string',
          description: 'X++ source for the object. FOR CLASSES the content is auto-split: <Declaration> = the class line + ALL member variables inside the outer { }; <Methods> = each method AFTER the closing }. CRITICAL: member variables MUST sit inside the class { }, methods after it — never the reverse.'
        },
        properties: {
          type: 'object',
          description:
            'Additional properties by objectType:\n' +
            '• class: extends, implements, isFinal, isAbstract\n' +
            '• table: label, tableGroup, tableType, titleField1/2, fields[{name,type?|edt?|fieldType?,enumType?,label?,mandatory?}] — enum fields need enumType (+ optionally fieldType:"AxTableFieldEnum")\n' +
            '• enum: label, useEnumValue, configurationKey, isExtensible, enumValues[{name,value?,label?,helpText?}]\n' +
            '• enum-extension: enumValues[{name,label?,value?,countryRegionCodes?}]\n' +
            '• table-extension: fields[{name,edt?,enumType?,label?,mandatory?,fieldType?}] — enum fields need fieldType:"AxTableFieldEnum" + enumType\n' +
            '• edt: label, extends, edtType, stringSize\n' +
            '• form: caption, formTemplate, dataSource\n' +
            '• security-privilege: label, targetObject, objectType (MenuItemDisplay|Action|Output), accessLevel (view|maintain), dataEntity (grants DataEntityPermissions)\n' +
            '• security-duty: label, privileges[]\n' +
            '• security-role: label, duties[], privileges[]\n' +
            '• menu-item-*: label, object, objectType\n' +
            '• data-entity: primaryTable, fields[{name,dataField?}]'
        },
        addToProject: {
          type: 'boolean',
          description: 'Add the file to the .rnrproj project. Keep the default (true) unless explicitly asked otherwise.',
          default: true
        },
        projectPath: {
          type: 'string',
          description: 'Path to .rnrproj file (needed for addToProject). Auto-detected from .mcp.json context or workspace if omitted.'
        },
        solutionPath: {
          type: 'string',
          description: 'VS solution directory — used to find .rnrproj when projectPath is not set.'
        },
        xmlContent: {
          type: 'string',
          description: 'Complete XML to write verbatim (with overwrite=true rewrites an existing object; Azure/Linux: pass XML produced by action=generate).',
        },
        overwrite: {
          type: 'boolean',
          description: 'Allow overwriting an existing file (use with xmlContent to fully rewrite an object \u2014 never via PowerShell/create_file).',
          default: false,
        },
        groundingToken: {
          type: 'string',
          description:
            'Provenance token from prepare(change/create). Required for *-extension objectTypes when ' +
            'GROUNDING_ENFORCE=true; object-bound — only valid for the object it was issued for.',
        },
        // ── action=modify only ──────────────────────────────────────────
        operation: {
          type: 'string',
          enum: [
            'add-method', 'remove-method', 'replace-code',
            'add-field', 'modify-field', 'rename-field', 'replace-all-fields', 'remove-field',
            'add-display-method', 'add-table-method',
            'add-index', 'remove-index',
            'add-relation', 'remove-relation',
            'add-field-group', 'remove-field-group', 'add-field-to-field-group',
            'add-field-modification',
            'add-data-source', 'add-control',
            'add-enum-value', 'modify-enum-value', 'remove-enum-value',
            'add-menu-item-to-menu',
            'modify-property',
          ],
          description:
            '[modify] REQUIRED. Modification to perform. Non-obvious ones:\n' +
            'add-method: adds OR updates in place when the method name exists (position preserved).\n' +
            'replace-code: surgical oldCode→newCode replacement; preferred for rewriting a known method. Form control overrides: methodName="ControlName.methodName".\n' +
            'rename-field: also fixes index DataField refs and TitleField1/2.\n' +
            'replace-all-fields: atomic rewrite of ALL fields (corrupted field names).\n' +
            'add-display-method: display method with [SysClientCacheDataMethodAttribute].\n' +
            'add-table-method: canonical find/exist/findByRecId/validateWrite/validateDelete/initValue boilerplate.\n' +
            'add-field-modification: override base-table field label/mandatory in a table-extension.\n' +
            'modify-property: any object-level property (TableGroup, TitleField1, TableType, Extends, …) — see propertyPath.'
        },
        methodName: {
          type: 'string',
          description: '[modify] Method name (required for add-method, remove-method)'
        },
        methodCode: {
          type: 'string',
          description:
            '[modify:add-method] Full X++ method source incl. modifiers/attributes (alias of sourceCode). A bare body gets its signature assembled from methodModifiers/methodReturnType/methodName/methodParameters.'
        },
        methodModifiers: {
          type: 'string',
          description: '[modify] e.g. "public static"'
        },
        methodReturnType: {
          type: 'string',
          description: '[modify] e.g. "void", "str", "boolean"'
        },
        methodParameters: {
          type: 'string',
          description: '[modify] e.g. "str _param1, int _param2"'
        },
        oldCode: {
          type: 'string',
          description: '[modify:replace-code] REQUIRED. Exact existing snippet to find (whitespace-trimmed match); methodName scopes the search.'
        },
        newCode: {
          type: 'string',
          description: '[modify:replace-code] REQUIRED. Replacement for the first occurrence; "" deletes the snippet.'
        },
        fieldName: {
          type: 'string',
          description: '[modify] Field name (required for add-field, modify-field, rename-field, remove-field)'
        },
        fieldNewName: {
          type: 'string',
          description: '[modify:rename-field] New field name (index DataField refs and TitleField1/2 fixed automatically).'
        },
        fieldType: {
          type: 'string',
          description: '[modify] EDT name for the field (required for add-field, e.g. "InventQty", "WHSZoneId", "TransDate"). For modify-field: new EDT to set.'
        },
        fieldBaseType: {
          type: 'string',
          enum: ['String', 'Integer', 'Real', 'Date', 'DateTime', 'Int64', 'GUID', 'Enum'],
          description:
            '[modify] Base type for add-field — REQUIRED when fieldType is an EDT name; selects the XML element ' +
            '(e.g. edt "InventQty" + "Real" → AxTableFieldReal). Defaults to String, which is WRONG for Real/Date/Int64.'
        },
        fieldMandatory: {
          type: 'boolean',
          description: '[modify] Is field mandatory (for add-field and modify-field)'
        },
        fieldLabel: {
          type: 'string',
          description: '[modify] Field label (for add-field and modify-field)'
        },
        fieldHelpText: {
          type: 'string',
          description: '[modify:modify-field] Field help text.'
        },
        fieldEnumType: {
          type: 'string',
          description: '[modify:modify-field] Enum name to set on an enum-typed field.'
        },
        fieldStringSize: {
          type: 'string',
          description: '[modify:modify-field] String size to set on a string-typed field.'
        },
        fields: {
          type: 'array',
          description: '[modify:replace-all-fields] Full replacement field list (atomic; for corrupted field names).',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Field name' },
              edt:  { type: 'string', description: 'EDT name, e.g. "InventQty", "WHSZoneId"' },
              type: {
                type: 'string',
                enum: ['String', 'Integer', 'Real', 'Date', 'DateTime', 'Int64', 'GUID', 'Enum'],
                description: 'Base type — REQUIRED alongside edt (same semantics as fieldBaseType).'
              },
              mandatory: { type: 'boolean' },
              label: { type: 'string' },
            },
            required: ['name'],
          },
        },
        propertyPath: {
          type: 'string',
          description:
            '[modify:modify-property] Property name to set. Supported names by objectType:\n' +
            'table: TableGroup, TitleField1/2, TableType (TempDB/InMemory/RegularTable), CacheLookup, ClusteredIndex, PrimaryIndex, SaveDataPerCompany, Label, HelpText, Extends, SystemTable.\n' +
            'table-extension (stored as <AxPropertyModification>): the table names above plus ModifiedDateTime, CreatedDateTime, ModifiedBy, CreatedBy (Yes/No), CountryRegionCodes ("CZ,SK").\n' +
            'edt: Extends, StringSize, Label, HelpText, ReferenceTable, ReferenceField.\n' +
            'class: Extends, Abstract, Final, Label.\n' +
            'form: any single text element (Caption, Pattern) via XML fallback.\n' +
            'Example: propertyPath="TableGroup" propertyValue="Group".'
        },
        propertyValue: {
          type: 'string',
          description: '[modify:modify-property] New property value (required for modify-property)'
        },
        controlName: {
          type: 'string',
          description: '[modify:add-control] Name of the new form control — MUST match the field name in the table extension so the binding works.'
        },
        parentControl: {
          type: 'string',
          description: '[modify:add-control] Existing parent tab/group in the base form (e.g. "TabGeneral"). Find the exact name via get_object_info(objectType="form", options={searchControl:"…"}).'
        },
        controlDataSource: {
          type: 'string',
          description: '[modify:add-control] Data source name for the control binding (e.g. "CustTable").'
        },
        controlDataField: {
          type: 'string',
          description: '[modify:add-control] Data field for the binding — must already exist in the table/table extension.'
        },
        controlType: {
          type: 'string',
          description: '[modify:add-control] String (default), Integer, Real, CheckBox (NoYes/boolean), ComboBox (enums), Date, DateTime, Int64, Group, Button, CommandButton, MenuFunctionButton.'
        },
        controlLabel: {
          type: 'string',
          description: '[modify:add-control] Optional label for the new control.'
        },
        positionType: {
          type: 'string',
          description: '[modify:add-control] Optional: AfterItem | BeforeItem. Omit to append at the end of the parent.'
        },
        previousSibling: {
          type: 'string',
          description: '[modify:add-control] Name of the sibling control to position after (used with positionType=AfterItem).'
        },
        baseFormName: {
          type: 'string',
          description: '[modify:add-control] Base form name for resolving parentControl — pass only when auto-detection from the extension name fails.'
        },
        // ── action=modify: add-table-method / add-display-method ─────────
        tableMethodType: {
          type: 'string',
          enum: ['find', 'exist', 'findByRecId', 'validateWrite', 'validateDelete', 'initValue'],
          description: '[modify:add-table-method] Standard method to auto-generate; find/exist also need tableKeyField. Omit and pass methodName+sourceCode for a custom method.'
        },
        tableKeyField: {
          type: 'string',
          description: '[modify:add-table-method] Primary key field for find/exist (e.g. "ItemId").'
        },
        displayMethodReturnEdt: {
          type: 'string',
          description: '[modify:add-display-method] Return EDT (e.g. "Name") — auto-generates a stub with methodName. Omit and pass sourceCode for a custom body.'
        },
        // ── action=modify: add-index / remove-index ─────────────────────
        indexName: {
          type: 'string',
          description: '[modify:add-index/remove-index] Index name.'
        },
        indexFields: {
          type: 'array',
          description: '[modify:add-index] Fields that make up the index (required for add-index).',
          items: {
            type: 'object',
            properties: {
              fieldName: { type: 'string', description: 'Field name.' },
              direction: { type: 'string', enum: ['Asc', 'Desc'], description: 'Sort direction (optional).' },
            },
            required: ['fieldName'],
          },
        },
        indexAllowDuplicates: {
          type: 'boolean',
          description: '[modify:add-index] Allow duplicates (default: false = unique).'
        },
        indexAlternateKey: {
          type: 'boolean',
          description: '[modify:add-index] Mark the index as an alternate key.'
        },
        indexEnabled: {
          type: 'boolean',
          description: '[modify:add-index] Whether the index is enabled (default: true).'
        },
        // ── action=modify: add-relation / remove-relation ───────────────
        relationName: {
          type: 'string',
          description: '[modify:add-relation/remove-relation] Relation name.'
        },
        relatedTable: {
          type: 'string',
          description: '[modify:add-relation] Related (foreign key) table name.'
        },
        relationConstraints: {
          type: 'array',
          description: '[modify:add-relation] Field constraints (field = relatedField pairs).',
          items: {
            type: 'object',
            properties: {
              fieldName: { type: 'string', description: 'Local field name.' },
              relatedFieldName: { type: 'string', description: 'Field name in the related table.' },
            },
            required: ['fieldName', 'relatedFieldName'],
          },
        },
        relationCardinality: {
          type: 'string',
          description: '[modify:add-relation] Local-side cardinality: ZeroMore | ZeroOne | ExactlyOne (default: ZeroMore).'
        },
        relatedTableCardinality: {
          type: 'string',
          description: '[modify:add-relation] Related-side cardinality: ZeroMore | ZeroOne | ExactlyOne (default: ExactlyOne).'
        },
        relationshipType: {
          type: 'string',
          description: '[modify:add-relation] Association | Composition | Aggregation | Link | Specialization (default: Association).'
        },
        // ── action=modify: field groups ─────────────────────────────────
        fieldGroupName: {
          type: 'string',
          description: '[modify:add-field-group/remove-field-group/add-field-to-field-group] Field group name.'
        },
        fieldGroupFields: {
          type: 'array',
          description: '[modify:add-field-group] Initial field names (may be empty — add later with add-field-to-field-group).',
          items: { type: 'string' },
        },
        fieldGroupLabel: {
          type: 'string',
          description: '[modify:add-field-group] Field group label (optional).'
        },
        extendBaseFieldGroup: {
          type: 'boolean',
          description: '[modify:add-field-to-field-group] table-extension only: true = extend an existing base-table group (<FieldGroupExtensions>); false = add to a group defined in the extension.'
        },
        // ── action=modify: add-data-source (form-extension) ─────────────
        dataSourceName: {
          type: 'string',
          description: '[modify:add-data-source] Data source reference name (e.g. "MyTable_1").'
        },
        dataSourceTable: {
          type: 'string',
          description: '[modify:add-data-source] Base table for the data source (e.g. "MyTable").'
        },
        joinSource: {
          type: 'string',
          description: '[modify:add-data-source] Optional existing data source on the form to join the new one to.'
        },
        linkType: {
          type: 'string',
          description: '[modify:add-data-source] Optional join/link type when joinSource is set: InnerJoin | OuterJoin | ExistJoin | NotExistJoin | Delayed | Active | Passive.'
        },
        // ── action=modify: enum values ──────────────────────────────────
        enumValueName: {
          type: 'string',
          description: '[modify:add-enum-value/modify-enum-value/remove-enum-value] Enum value name (e.g. "Approved").'
        },
        enumValueLabel: {
          type: 'string',
          description: '[modify:add-enum-value/modify-enum-value] Label reference (e.g. "@MyModel:Approved").'
        },
        enumValueHelpText: {
          type: 'string',
          description: '[modify:add-enum-value] Help-text reference (optional).'
        },
        enumValueInt: {
          type: 'number',
          description: '[modify:add-enum-value] Explicit integer value (omitted = next available).'
        },
        enumValueCountryRegionCodes: {
          type: 'string',
          description: '[modify:add-enum-value] ISO country/region codes, comma-separated (e.g. "CZ,SK").'
        },
        // ── action=modify: add-menu-item-to-menu ────────────────────────
        menuItemToAdd: {
          type: 'string',
          description: '[modify:add-menu-item-to-menu] Name of the menu item to add (e.g. "MyCustomForm").'
        },
        menuItemToAddType: {
          type: 'string',
          enum: ['display', 'action', 'output'],
          description: '[modify:add-menu-item-to-menu] Menu item kind: display (form), action (class), output (report). Default: display.'
        },
        createBackup: {
          type: 'boolean',
          description: '[modify] Create backup before modification (default: false)',
          default: false
        },
        filePath: {
          type: 'string',
          description: '[modify] Absolute path to the XML file — bypasses symbol-DB lookup. Use when the object was just created and the path is known.'
        },
        workspacePath: {
          type: 'string',
          description: '[modify] Path to workspace for finding file'
        },
      },
      required: ['action'],
    },
  };
