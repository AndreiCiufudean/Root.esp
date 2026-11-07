#pragma once
#include <cstddef>
class Preferences{public:bool begin(const char*,bool){return true;}bool getBool(const char*,bool fallback){return fallback;}std::size_t putBool(const char*,bool){return 1;}};
