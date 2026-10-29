#include "LEDURI.h"

LEDURI::LEDURI(int p)
{
  pin=p;
}

void LEDURI::begin()
{
  pinMode(pin, OUTPUT);
}

void LEDURI::porneste()
{
  digitalWrite(pin, HIGH);
}

void LEDURI::opreste()
{
  digitalWrite(pin, LOW);
}