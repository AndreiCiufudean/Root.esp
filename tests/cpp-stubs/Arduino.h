#pragma once
#include <algorithm>
#include <cmath>
#define INPUT 0
#define OUTPUT 1
#define HIGH 1
#define LOW 0
extern int test_sample;
extern unsigned long test_ms;
inline int analogRead(int) { return test_sample; }
inline void pinMode(int,int) {}
inline void digitalWrite(int,int) {}
inline void delay(unsigned long ms) { test_ms += ms; }
inline unsigned long millis() { return test_ms; }
template<class T,class U,class V> T constrain(T value,U lo,V hi) {return std::clamp(value,static_cast<T>(lo),static_cast<T>(hi));}
inline long map(long x,long a,long b,long c,long d) {return (x-a)*(d-c)/(b-a)+c;}
struct FakeSerial {void begin(int){} template<class T> void print(T) {} template<class T> void println(T) {} }; inline FakeSerial Serial;
