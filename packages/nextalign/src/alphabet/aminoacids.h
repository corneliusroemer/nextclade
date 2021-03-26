#pragma once

#include <nextalign/nextalign.h>

#include <gsl/string_span>
#include <string>

#include "../utils/to_underlying.h"
#include "nextalign/private/nextalign_private.h"

using AminoacidSequenceSpan = SequenceSpan<Aminoacid>;

Aminoacid charToAa(char aa);

char aaToChar(Aminoacid aa);

std::string aaToString(Aminoacid nuc);

inline std::ostream& operator<<(std::ostream& os, const Aminoacid& aminoacid) {
  os << aaToString(aminoacid);
  return os;
}
