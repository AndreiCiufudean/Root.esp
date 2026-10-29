#ifndef S_UMIDITATESOL_H
#define S_UMIDITATESOL_H

#include <Arduino.h>

class SenzorUmiditateSol
{
  private:
    int pin;
    const int umed=0;
    const int uscat=1023;
  public:
    SenzorUmiditateSol(int p);
    void begin();
    int CitireUmiditateSol(); // in procente
};

#endif S_UMIDITATESOL_H