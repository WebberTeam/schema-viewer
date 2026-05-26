/**
 * Demo schema — EKG entity_resolution RDS database.
 * This demonstrates the viewer rendering a real production schema.
 */
export const demoSchema = {
  database: "postgres",
  title: "EKG Entity Resolution",
  tables: [
    // === TYPE SYSTEM ===
    {
      id: "type_registry", name: "type_registry", x: 680, y: 30, color: "#bc8cff",
      comment: "Ontology nodes with BFO classification",
      fields: [
        { id: "tr_id", name: "type_id", type: "TEXT", primary: true },
        { id: "tr_depth", name: "depth", type: "SMALLINT" },
        { id: "tr_level", name: "level", type: "SMALLINT" },
        { id: "tr_l1", name: "l1_ancestors", type: "TEXT[]" },
        { id: "tr_own", name: "own_prop_count", type: "SMALLINT" },
        { id: "tr_props", name: "properties", type: "JSONB" },
        { id: "tr_src", name: "source", type: "TEXT" },
      ],
    },
    {
      id: "type_edges", name: "type_edges", x: 680, y: 340, color: "#bc8cff",
      comment: "IS-A relationships (DAG)",
      fields: [
        { id: "te_child", name: "child_id", type: "TEXT", primary: true },
        { id: "te_parent", name: "parent_id", type: "TEXT", primary: true },
        { id: "te_conf", name: "confidence", type: "TEXT" },
        { id: "te_src", name: "source", type: "TEXT" },
      ],
    },
    {
      id: "type_ancestors", name: "type_ancestors", x: 950, y: 200, color: "#bc8cff",
      comment: "Materialized transitive closure — O(1) subtype check",
      fields: [
        { id: "ta_type", name: "type_id", type: "TEXT", primary: true },
        { id: "ta_anc", name: "ancestor_id", type: "TEXT", primary: true },
        { id: "ta_hops", name: "hops", type: "SMALLINT" },
      ],
    },

    // === ENTITY REFERENCE HUB ===
    {
      id: "entity_reference", name: "entity_reference", x: 300, y: 520, color: "#3fb950",
      comment: "Partitioned hub — LIST by source, 132K rows",
      fields: [
        { id: "er_id", name: "id", type: "BIGSERIAL", primary: true },
        { id: "er_src", name: "source", type: "TEXT", notNull: true },
        { id: "er_sid", name: "source_id", type: "TEXT", notNull: true },
        { id: "er_type", name: "type_id", type: "TEXT", notNull: true },
        { id: "er_name", name: "name", type: "TEXT", notNull: true },
        { id: "er_alias", name: "aliases", type: "TEXT[]" },
        { id: "er_pop", name: "popularity", type: "INT" },
        { id: "er_qid", name: "wikidata_qid", type: "TEXT" },
        { id: "er_pk", name: "partition_key", type: "INT" },
        { id: "er_ts", name: "ts_simple", type: "TSVECTOR" },
      ],
    },

    // === SPOKES ===
    {
      id: "ref_drugbank", name: "ref_drugbank", x: 40, y: 820, color: "#2ea043",
      comment: "Drug attributes — ~10K rows",
      fields: [
        { id: "rd_id", name: "entity_ref_id", type: "BIGINT", notNull: true },
        { id: "rd_type", name: "drug_type", type: "TEXT" },
        { id: "rd_atc", name: "atc_code", type: "TEXT" },
        { id: "rd_rxn", name: "rxnorm_id", type: "TEXT" },
        { id: "rd_mesh", name: "mesh_id", type: "TEXT" },
      ],
    },
    {
      id: "ref_cpe", name: "ref_cpe", x: 340, y: 820, color: "#2ea043",
      comment: "Software/hardware products — ~200K rows",
      fields: [
        { id: "rc_id", name: "entity_ref_id", type: "BIGINT", notNull: true },
        { id: "rc_vendor", name: "vendor", type: "TEXT" },
        { id: "rc_product", name: "product", type: "TEXT" },
        { id: "rc_part", name: "part", type: "CHAR(1)" },
        { id: "rc_cpe", name: "cpe_name", type: "TEXT" },
      ],
    },
    {
      id: "ref_crossref", name: "ref_crossref", x: 620, y: 820, color: "#21262d",
      comment: "Scholarly publications — planned",
      fields: [
        { id: "rx_id", name: "entity_ref_id", type: "BIGINT", notNull: true },
        { id: "rx_doi", name: "doi", type: "TEXT" },
        { id: "rx_year", name: "year", type: "INT" },
        { id: "rx_cited", name: "cited_by_count", type: "INT" },
      ],
    },

    // === EDGES ===
    {
      id: "entity_reference_edges", name: "entity_reference_edges", x: 680, y: 590, color: "#db6d28",
      comment: "Typed relationships — 58K edges",
      fields: [
        { id: "ee_id", name: "id", type: "BIGSERIAL", primary: true },
        { id: "ee_src", name: "source", type: "TEXT", notNull: true },
        { id: "ee_subj", name: "subject_id", type: "TEXT", notNull: true },
        { id: "ee_pred", name: "predicate", type: "TEXT", notNull: true },
        { id: "ee_obj", name: "object_id", type: "TEXT", notNull: true },
        { id: "ee_meta", name: "metadata", type: "JSONB" },
      ],
    },

    // === LEGACY ===
    {
      id: "entities", name: "entities", x: 40, y: 30, color: "#388bfd",
      comment: "Legacy Wikidata hub — ~100K rows",
      fields: [
        { id: "e_qid", name: "qid", type: "TEXT", primary: true },
        { id: "e_type", name: "schema_type", type: "TEXT", notNull: true },
        { id: "e_label", name: "label_en", type: "TEXT", notNull: true },
        { id: "e_aliases", name: "aliases_en", type: "TEXT[]" },
        { id: "e_pop", name: "popularity", type: "INTEGER" },
      ],
    },
    {
      id: "surface_forms", name: "surface_forms", x: 40, y: 280, color: "#388bfd",
      comment: "Lookup index — ~500K rows",
      fields: [
        { id: "sf_norm", name: "normalized_form", type: "TEXT", primary: true },
        { id: "sf_qid", name: "qid", type: "TEXT", primary: true },
        { id: "sf_slot", name: "slot_type", type: "TEXT", primary: true },
        { id: "sf_src", name: "source", type: "TEXT" },
      ],
    },
    {
      id: "entity_xrefs", name: "entity_xrefs", x: 340, y: 280, color: "#388bfd",
      comment: "Cross-references — ~300K rows",
      fields: [
        { id: "ex_qid", name: "qid", type: "TEXT" },
        { id: "ex_sys", name: "system", type: "TEXT", primary: true },
        { id: "ex_ident", name: "identifier", type: "TEXT", primary: true },
      ],
    },
  ],

  relationships: [
    // Type system
    { id: "r_te_child", name: "child", startTableId: "type_edges", startFieldId: "te_child", endTableId: "type_registry", endFieldId: "tr_id", cardinality: "many_to_one" },
    { id: "r_te_parent", name: "parent", startTableId: "type_edges", startFieldId: "te_parent", endTableId: "type_registry", endFieldId: "tr_id", cardinality: "many_to_one" },
    { id: "r_ta_type", name: "type", startTableId: "type_ancestors", startFieldId: "ta_type", endTableId: "type_registry", endFieldId: "tr_id", cardinality: "many_to_one" },
    { id: "r_ta_anc", name: "ancestor", startTableId: "type_ancestors", startFieldId: "ta_anc", endTableId: "type_registry", endFieldId: "tr_id", cardinality: "many_to_one" },

    // Entity ref → type_registry
    { id: "r_er_type", name: "type_id", startTableId: "entity_reference", startFieldId: "er_type", endTableId: "type_registry", endFieldId: "tr_id", cardinality: "many_to_one" },

    // Spokes → hub
    { id: "r_rd_hub", name: "FK", startTableId: "ref_drugbank", startFieldId: "rd_id", endTableId: "entity_reference", endFieldId: "er_id", cardinality: "many_to_one" },
    { id: "r_rc_hub", name: "FK", startTableId: "ref_cpe", startFieldId: "rc_id", endTableId: "entity_reference", endFieldId: "er_id", cardinality: "many_to_one" },
    { id: "r_rx_hub", name: "FK", startTableId: "ref_crossref", startFieldId: "rx_id", endTableId: "entity_reference", endFieldId: "er_id", cardinality: "many_to_one" },

    // Edges → hub (logical, via source_id)
    { id: "r_ee_hub", name: "subject", startTableId: "entity_reference_edges", startFieldId: "ee_subj", endTableId: "entity_reference", endFieldId: "er_sid", cardinality: "many_to_one" },

    // Legacy FKs
    { id: "r_sf_ent", name: "qid", startTableId: "surface_forms", startFieldId: "sf_qid", endTableId: "entities", endFieldId: "e_qid", cardinality: "many_to_one" },
    { id: "r_ex_ent", name: "qid", startTableId: "entity_xrefs", startFieldId: "ex_qid", endTableId: "entities", endFieldId: "e_qid", cardinality: "many_to_one" },
  ],

  subjectAreas: [
    { id: 1, name: "TYPE SYSTEM (Ontology DAG)", x: 660, y: 10, width: 340, height: 480, color: "#bc8cff" },
    { id: 2, name: "ENTITY REFERENCE (Hub + Spoke)", x: 20, y: 500, width: 920, height: 420, color: "#3fb950" },
    { id: 3, name: "LEGACY (Wikidata)", x: 20, y: 10, width: 600, height: 470, color: "#388bfd" },
  ],
};
