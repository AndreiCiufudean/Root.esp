#include "Mosfet.h"

Mosfet::Mosfet(int p)
{
  pin=p;
}

void Mosfet::begin()
{
  pinMode(pin, OUTPUT);
}

void Mosfet::porneste()
{
  digitalWrite(pin, HIGH);
}

void Mosfet::opreste()
{
  digitalWrite(pin, LOW);
}