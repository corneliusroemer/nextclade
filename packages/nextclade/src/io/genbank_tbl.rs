use crate::coord::position::PositionLike;
use crate::gene::cds::Cds;
use crate::gene::cds_segment::Truncation;
use crate::gene::gene::Gene;
use crate::gene::gene::GeneStrand::Reverse;
use crate::gene::gene_map::GeneMap;
use crate::io::file::create_file_or_stdout;
use crate::types::outputs::NextcladeOutputs;
use csv::{Writer as CsvWriter, WriterBuilder as CsvWriterBuilder};
use eyre::Report;
use std::io::Write;
use std::path::Path;

/// Writes Genbank Feature Table into a writer (`std::io::Write`)
///
/// See: https://www.ncbi.nlm.nih.gov/genbank/feature_table/
pub struct GenbankTblWriter<W: Write + Send> {
  writer: CsvWriter<W>,
}

impl<W: Write + Send> GenbankTblWriter<W> {
  pub fn new(writer: W) -> Result<Self, Report> {
    let writer = CsvWriterBuilder::new()
      .delimiter(b'\t')
      .flexible(true)
      .has_headers(false)
      .from_writer(writer);
    Ok(Self { writer })
  }

  pub fn write_genemap(&mut self, gene_map: &GeneMap) -> Result<(), Report> {
    if gene_map.is_empty() {
      return Ok(());
    }

    let seq_id = gene_map
      .genes
      .first()
      .and_then(|gene| gene.gff_seqid.clone())
      .unwrap_or_default();

    // Write a line with sequence name
    // Example:
    // >Feature gb|MN908947.3|
    self.writer.write_record(&[format!(">Feature {seq_id}")])?;

    for gene in &gene_map.genes {
      self.write_gene(gene)?;
      for cds in &gene.cdses {
        self.write_cds(cds)?;
      }
    }

    Ok(())
  }

  fn write_gene(&mut self, gene: &Gene) -> Result<(), Report> {
    let mut start = (gene.start().as_usize() + 1).to_string(); // Convert to 1-based indexing
    let mut end = gene.end().as_usize().to_string();
    if gene.strand()? == Reverse {
      (start, end) = (end, start);
    }

    // Write a line with feature's boundaries and feature's kind
    // Example:
    // 21563 <TAB> 25384 <TAB> gene
    self.writer.write_record([&start, &end, "gene"])?;

    // Write lines with feature's qualifiers
    // Example:
    // <TAB> <TAB> <TAB> product    <TAB> surface glycoprotein
    // <TAB> <TAB> <TAB> protein_id <TAB> gb|QHD43416.1|
    // <TAB> <TAB> <TAB> note       <TAB> structural protein
    for (key, values) in &gene.attributes {
      for value in values {
        self.writer.write_record(["", "", "", key, value])?;
      }
    }

    Ok(())
  }

  fn write_cds(&mut self, cds: &Cds) -> Result<(), Report> {
    for (i, seg) in cds.segments.iter().enumerate() {
      let mut start = (seg.start().as_usize() + 1).to_string(); // Convert to 1-based indexing
      let mut end = seg.end().as_usize().to_string();
      if seg.strand == Reverse {
        (start, end) = (end, start);
      }

      // Feature type is written only for the first segment
      let feature_type = if i == 0 { "CDS" } else { "" };

      // If there is a truncation on 5' or 3' end, prefix the start/end position with "<" or ">",
      // as an incomplete feature
      if matches!(seg.truncation, Truncation::FivePrime(_) | Truncation::Both(_)) {
        start = format!("<{start}");
      }
      if matches!(seg.truncation, Truncation::ThreePrime(_) | Truncation::Both(_)) {
        end = format!(">{end}");
      }

      // Write a line with feature's boundaries and feature's kind
      // Example:
      // 21563 <TAB> 25384 <TAB> CDS
      self.writer.write_record([&start, &end, feature_type])?;

      // Write lines with feature's qualifiers
      // Example:
      // <TAB> <TAB> <TAB> product    <TAB> surface glycoprotein
      // <TAB> <TAB> <TAB> protein_id <TAB> gb|QHD43416.1|
      // <TAB> <TAB> <TAB> note       <TAB> structural protein
      for (key, values) in &seg.attributes {
        for value in values {
          self.writer.write_record(["", "", "", key, value])?;
        }
      }

      // Phase is added as an additional "codon_start" qualifier on the first CDS interval
      // in one-based format. It is only added if it's not "1" (phase 0).
      if i == 0 {
        let codon_start = seg.phase.to_usize() + 1;
        if codon_start != 1 {
          self
            .writer
            .write_record(["", "", "", "codon_start", &codon_start.to_string()])?;
        }
      }
    }

    Ok(())
  }
}

/// Writes Genbank Feature Table into a file
///
/// See: https://www.ncbi.nlm.nih.gov/genbank/feature_table/
pub struct GenbankTblFileWriter {
  writer: GenbankTblWriter<Box<dyn Write + Send>>,
}

impl GenbankTblFileWriter {
  pub fn new(filepath: impl AsRef<Path>) -> Result<Self, Report> {
    let file = create_file_or_stdout(filepath)?;
    Ok(Self {
      writer: GenbankTblWriter::new(file)?,
    })
  }

  pub fn write_genemap(&mut self, gene_map: &GeneMap) -> Result<(), Report> {
    self.writer.write_genemap(gene_map)
  }
}

pub fn results_to_tbl_string(outputs: &[NextcladeOutputs]) -> Result<String, Report> {
  let mut buf = Vec::<u8>::new();
  {
    let mut writer = GenbankTblWriter::new(&mut buf)?;
    for output in outputs {
      writer.write_genemap(&output.annotation)?;
    }
  }
  Ok(String::from_utf8(buf)?)
}
